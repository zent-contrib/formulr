import { RefObject } from 'react';
import { Observable, Operator, OperatorFunction, Subscriber, isObservable, from, NextObserver, of, empty } from 'rxjs';
import { BasicModel, FormModel, FieldSetModel } from './models';
import { isPromise } from './utils';
import { catchError } from 'rxjs/operators';

export interface IValidateResult<T> {
  name: string;
  message?: string;
  expect?: T;
  actual?: T;
  [key: string]: any;
}

export type IMaybeError<T> = IValidateResult<T> | null;

export enum ValidateStrategy {
  Normal = 0b0000,
  IgnoreAsync = 0b0010,
  IgnoreTouched = 0b0100,
  IncludeChildren = 0b1000,
}

export interface IValidateContext {
  strategy: number;
  form: FormModel;
}

export interface IValidator<Value> {
  (input: Value, ctx: ValidatorContext): ValidatorResult<Value> | null;
  isAsync?: boolean;
}

export type ValidatorResult<T> = IMaybeError<T> | Promise<IMaybeError<T>> | Observable<IMaybeError<T>>;

class ValidateOperator<T> implements Operator<ValidateStrategy, Observable<IMaybeError<T>>> {
  constructor(private readonly model: BasicModel<T>, private readonly ctx: ValidatorContext) {}

  call(subscriber: Subscriber<Observable<IMaybeError<T>>>, source: Observable<ValidateStrategy>) {
    return source.subscribe(new ValidateSubscriber(subscriber, this.model, this.ctx));
  }
}

function resultToSubscriber<T>(
  subscriber: Subscriber<IValidateResult<T> | null>,
  validator: IValidator<T>,
  ctx: ValidatorContext,
  value: T,
) {
  try {
    const a = validator(value, ctx);
    if (a === null) {
      subscriber.complete();
    }
    let observable: Observable<IMaybeError<T>>;
    if (isPromise<IMaybeError<T>>(a)) {
      observable = from(
        a.catch((error: unknown) => {
          ctx.form.removeWorkingValidator(observable);
          setTimeout(() => {
            throw error;
          });
          return null;
        }),
      );
    } else if (isObservable<IMaybeError<T>>(a)) {
      observable = a.pipe(
        catchError(error => {
          ctx.form.removeWorkingValidator(observable);
          setTimeout(() => {
            throw error;
          });
          return empty();
        }),
      );
    } else {
      subscriber.next(a);
      subscriber.complete();
      return;
    }
    ctx.form.addWorkingValidator(observable);
    const $ = observable.subscribe(subscriber);
    return () => {
      ctx.form.removeWorkingValidator(observable);
      $.unsubscribe();
    };
  } catch (error) {
    subscriber.complete();
  }
}

class ValidateSubscriber<T> extends Subscriber<ValidateStrategy> {
  constructor(
    destination: Subscriber<Observable<IMaybeError<T>>>,
    private readonly model: BasicModel<T>,
    private readonly ctx: ValidatorContext,
  ) {
    super(destination);
  }

  protected _next(strategy: ValidateStrategy) {
    this._destinationNext(of(null));
    const { validators, touched } = this.model;
    if (!touched && !(strategy & ValidateStrategy.IgnoreTouched)) {
      return;
    }
    const ignoreAsync = (strategy & ValidateStrategy.IgnoreAsync) > 0;
    const value = this.model.getRawValue();
    for (let i = 0; i < validators.length; i += 1) {
      const validator = validators[i];
      if (ignoreAsync && validator.isAsync) {
        continue;
      }
      const validate$ = new Observable<IMaybeError<T>>(subscriber =>
        resultToSubscriber(subscriber, validator, this.ctx, value),
      );
      this._destinationNext(validate$);
    }
  }

  private _destinationNext(next: Observable<IMaybeError<T>>) {
    this.destination.next && this.destination.next(next);
  }

  unsubscribe() {
    super.unsubscribe();
  }
}

export function validate<T>(
  model: BasicModel<T>,
  form: FormModel,
  parent: FieldSetModel,
): OperatorFunction<ValidateStrategy, Observable<IMaybeError<T>>> {
  const ctx = new ValidatorContext(parent, form);
  return function validateOperation(source: Observable<ValidateStrategy>): Observable<Observable<IMaybeError<T>>> {
    return source.lift(new ValidateOperator(model, ctx));
  };
}

export class ErrorSubscriber<T> implements NextObserver<IMaybeError<T>> {
  constructor(private readonly model: BasicModel<T>) {}

  next(error: IMaybeError<T>) {
    this.model.error = error;
  }
}

export function filterWithCompositing(compositingRef: RefObject<boolean>) {
  return () => !compositingRef.current;
}

export class ValidatorContext {
  constructor(public readonly parent: FieldSetModel, public readonly form: FormModel) {}

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
