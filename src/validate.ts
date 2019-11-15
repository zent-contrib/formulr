import { Observable, from, NextObserver, empty, of, defer } from 'rxjs';
import { catchError, map, concatAll, filter, takeWhile, tap, finalize } from 'rxjs/operators';
import { BasicModel, isFieldSetModel } from './models';

export const ASYNC_VALIDATOR = Symbol('AsyncValidator');

export interface IAsyncValidator<T> {
  [ASYNC_VALIDATOR]: true;
  validator(input: T, ctx: ValidatorContext<T>): null | Observable<IMaybeError<T>> | Promise<IMaybeError<T>>;
}

export interface ISyncValidator<T> {
  (input: T, ctx: ValidatorContext<T>): IMaybeError<T>;
  $$id?: symbol;
}

export type IValidator<T> = IAsyncValidator<T> | ISyncValidator<T>;

export type IValidators<T> = readonly IValidator<T>[];

export function isAsyncValidator<T>(
  validator: ISyncValidator<T> | IAsyncValidator<T>,
): validator is IAsyncValidator<T> {
  if ((validator as ISyncValidator<T> & IAsyncValidator<T>)[ASYNC_VALIDATOR]) {
    return true;
  }
  return false;
}

export function createAsyncValidator<T>(
  validator: () => null | Observable<IMaybeError<T>> | Promise<IMaybeError<T>>,
): IAsyncValidator<T> {
  return {
    [ASYNC_VALIDATOR]: true,
    validator,
  };
}

export interface IValidateResult<T> {
  name: string;
  message?: string;
  expect?: T;
  actual?: T;
  [key: string]: any;
}

export type IMaybeError<T> = IValidateResult<T> | null;

// prettier-ignore
export enum ValidateOption {
  Empty                         = 0b000000000,
  IncludeAsync                  = 0b000000010,
  IncludeUntouched              = 0b000000100,
  IncludeChildrenRecursively    = 0b000001000,
  ExcludePristine               = 0b000010000,

  Default                       = Empty,
}

export interface IValidation {
  option: ValidateOption;
  resolve(error?: IMaybeError<any>): void;
  reject(error?: any): void;
}

export class ErrorSubscriber<T> implements NextObserver<IMaybeError<T>> {
  constructor(private readonly model: BasicModel<T>) {}

  next(error: IMaybeError<T>) {
    this.model.error = error;
  }
}

export class ValidatorContext<T> {
  constructor(readonly model: BasicModel<T>) {}

  getSection(): BasicModel<T>['owner'] {
    return this.model.owner;
  }

  getSectionValue<T>(...names: string[]): T | null {
    if (!this.model.owner || !isFieldSetModel(this.model.owner)) {
      return null;
    }
    if (names.length === 0) {
      return this.model.owner.getRawValue() as T;
    }
    const data: Record<string, unknown> = {};
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const model = this.model.owner.get(name);
      if (model) {
        data[name] = model.getRawValue();
      }
    }
    return data as T;
  }

  getFormValue<T extends object = Record<string, unknown>>(): T | null {
    return this.model.form && this.model.form.getRawValue();
  }
}

function runValidator<T>(
  validator: IAsyncValidator<T> | ISyncValidator<T>,
  { reject }: IValidation,
  value: T,
  ctx: ValidatorContext<T>,
): Observable<IMaybeError<T>> {
  try {
    if (isAsyncValidator(validator)) {
      const ret = validator.validator(value, ctx);
      if (ret === null) {
        return of(null);
      }
      return from(ret);
    } else {
      return of(validator(value, ctx));
    }
  } catch (error) {
    reject(error);
    return empty();
  }
}

class ValidatorExecutor<T> {
  readonly ctx: ValidatorContext<T>;

  constructor(private readonly model: BasicModel<T>) {
    this.ctx = new ValidatorContext(model);
  }

  call(validation: IValidation): Observable<IMaybeError<T>> {
    const { option, reject, resolve } = validation;
    if (!this.model.touched() && !(option & ValidateOption.IncludeUntouched)) {
      resolve();
      return of(null);
    }
    if (option & ValidateOption.ExcludePristine && this.model.pristine()) {
      resolve();
      return of(null);
    }
    const value = this.model.getRawValue();
    const skipAsync = (option & ValidateOption.IncludeAsync) === 0;
    return from(this.model.validators).pipe(
      filter(validator => (skipAsync ? !isAsyncValidator(validator) : true)),
      map(validator => defer(() => runValidator(validator, validation, value, this.ctx))),
      concatAll(),
      takeWhile(it => it === null, true),
      catchError(error => {
        reject(error);
        return empty();
      }),
      tap(resolve),
      finalize(resolve),
    );
  }
}

export function validate<T>(model: BasicModel<T>) {
  const executor = new ValidatorExecutor(model);
  return (validation: IValidation) => executor.call(validation);
}
