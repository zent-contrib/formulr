import { Observable, isObservable, from, NextObserver, empty, of, defer } from 'rxjs';
import { catchError, map, concatAll, filter, takeWhile, finalize } from 'rxjs/operators';
import { BasicModel, isFieldSetModel } from './models';
import { isPromise, isNull } from './utils';

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
  Default           =       0b000000000,
  IncludeAsync      =       0b000000010,
  IncludeUntouched  =       0b000000100,
  IncludeChildren   =       0b000001000,

  FromParent        =       0b100000000,
}

export interface IValidation {
  option: ValidateOption;
  resolve(): void;
  reject(error?: any): void;
}

export interface IValidator<Value> {
  (input: Value, ctx: ValidatorContext<Value>): ValidatorResult<Value>;
  isAsync?: boolean;
  $$id?: symbol;
}

export type ValidatorResult<T> = null | Observable<IMaybeError<T>> | Promise<IMaybeError<T>> | IMaybeError<T>;

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

function filterAsync<T>(skipAsync: boolean, validator: IValidator<T>) {
  return skipAsync ? !validator.isAsync : true;
}

function runValidator<T>(
  validator: IValidator<T>,
  { reject }: IValidation,
  value: T,
  ctx: ValidatorContext<T>,
): Observable<IMaybeError<T>> {
  let result: ValidatorResult<T>;
  try {
    result = validator(value, ctx);
  } catch (error) {
    reject(error);
    return empty();
  }
  if (isPromise<IMaybeError<T>>(result)) {
    return from(result);
  } else if (isObservable<IMaybeError<T>>(result)) {
    return result;
  } else {
    return of(result);
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
    const value = this.model.getRawValue();
    const skipAsync = (option & ValidateOption.IncludeAsync) === 0;
    return from(this.model.validators).pipe(
      filter(validator => filterAsync(skipAsync, validator)),
      map(validator => defer(() => runValidator(validator, validation, value, this.ctx))),
      concatAll(),
      takeWhile(isNull, true),
      catchError(error => {
        reject(error);
        return empty();
      }),
      finalize(resolve),
    );
  }
}

export function validate<T>(model: BasicModel<T>) {
  const executor = new ValidatorExecutor(model);
  return (validation: IValidation) => executor.call(validation);
}
