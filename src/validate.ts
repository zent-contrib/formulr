import { Observable, Subscriber, isObservable, from, NextObserver, empty, never } from 'rxjs';
import { catchError, map, concatAll, filter, take } from 'rxjs/operators';
import { BasicModel, FormModel, FieldSetModel } from './models';
import { isPromise } from './utils';

export interface IValidateResult<T> {
  name: string;
  message?: string;
  expect?: T;
  actual?: T;
  [key: string]: any;
}

export type IMaybeError<T> = IValidateResult<T> | null;

export enum ValidateStrategy {
  Default = 0b0000,
  IncludeAsync = 0b0010,
  IncludeUntouched = 0b0100,
  IncludeChildren = 0b1000,
}

export interface IValidator<Value> {
  (input: Value, ctx: ValidatorContext): ValidatorResult<Value> | null;
  isAsync?: boolean;
  $$id?: symbol;
}

export type ValidatorResult<T> = IMaybeError<T> | Promise<IMaybeError<T>> | Observable<IMaybeError<T>>;

function resultToSubscriber<T>(
  subscriber: Subscriber<IMaybeError<T>>,
  validator: IValidator<T>,
  ctx: ValidatorContext,
  value: T,
) {
  try {
    const a = validator(value, ctx);
    let observable: Observable<IMaybeError<T>>;
    if (isPromise<IMaybeError<T>>(a)) {
      observable = from(a);
    } else if (isObservable<IMaybeError<T>>(a)) {
      observable = a;
    } else {
      subscriber.next(a);
      subscriber.complete();
      return;
    }
    ctx.form.addWorkingValidator(observable);
    const $ = observable
      .pipe(
        catchError(error => {
          ctx.form.removeWorkingValidator(observable);
          setTimeout(() => {
            throw error;
          });
          return empty();
        }),
      )
      .subscribe(subscriber);
    return () => {
      ctx.form.removeWorkingValidator(observable);
      $.unsubscribe();
    };
  } catch (error) {
    subscriber.complete();
  }
}

export class ErrorSubscriber<T> implements NextObserver<IMaybeError<T>> {
  constructor(private readonly model: BasicModel<T>) {}

  next(error: IMaybeError<T>) {
    this.model.error = error;
  }
}

export class ValidatorContext {
  constructor(public readonly parent: FieldSetModel, public readonly form: FormModel<any>) {}

  getSectionValue<T extends object = Record<string, unknown>>(...names: string[]): T {
    if (names.length === 0) {
      return this.parent.getRawValue() as any;
    }
    const { children } = this.parent;
    const data: Record<string, unknown> = {};
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const model = children[name];
      if (model) {
        data[name] = model.getRawValue();
      }
    }
    return data as any;
  }

  getFormValue<T extends object = Record<string, unknown>>(): T {
    return this.form.getRawValue();
  }
}

function filterAsync<T>(skipAsync: boolean, validator: IValidator<T>) {
  return skipAsync ? !validator.isAsync : true;
}

class ValidatorExecutor<T> {
  private prevValue: T | null = null;

  constructor(private readonly model: BasicModel<T>, private readonly ctx: ValidatorContext) {}

  call(strategy: ValidateStrategy): Observable<IMaybeError<T>> {
    if (!this.model.touched && !(strategy & ValidateStrategy.IncludeUntouched)) {
      return never();
    }
    const value = this.model.getRawValue();
    if (Object.is(value, this.prevValue)) {
      return never();
    }
    this.prevValue = value;
    const skipAsync = (strategy & ValidateStrategy.IncludeAsync) === 0;
    return from(this.model.validators).pipe(
      filter(validator => filterAsync(skipAsync, validator)),
      map(
        validator =>
          new Observable<IMaybeError<T>>(subscriber => resultToSubscriber(subscriber, validator, this.ctx, value)),
      ),
      concatAll(),
      take(1),
    );
  }
}

export function validate<T>(model: BasicModel<T>, ctx: ValidatorContext) {
  const executor = new ValidatorExecutor(model, ctx);
  return (strategy: ValidateStrategy) => executor.call(strategy);
}
