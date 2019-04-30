import { RefObject } from 'react';
import {
  Observable,
  Subscription,
  Operator,
  OperatorFunction,
  Subscriber,
  Observer,
  isObservable,
  from,
  NextObserver,
} from 'rxjs';
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

export type ValidatorResult<T> =
  | IValidateResult<T>
  | null
  | Promise<IValidateResult<T> | null>
  | Observable<IValidateResult<T> | null>;

class ValidatorResultSubscriber<T> implements Observer<IValidateResult<T> | null> {
  closed = false;

  constructor(
    private readonly subscriber: ValidateSubscriber<T>,
    readonly original$: Observable<IValidateResult<T> | null>,
  ) {}

  next(result: IValidateResult<T> | null) {
    if (this.closed) {
      return;
    }
    this.subscriber.childResult(result);
  }

  error(err?: unknown) {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.subscriber.childError(this, err);
  }

  complete() {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.subscriber.childComplete(this);
  }
}

class ValidateOperator<T> implements Operator<ValidateStrategy, IMaybeError<T>> {
  constructor(
    private readonly model: BasicModel<T>,
    private readonly form: FormModel,
    private readonly ctx: ValidatorContext,
  ) {}

  call(subscriber: Subscriber<IMaybeError<T>>, source: Observable<ValidateStrategy>) {
    return source.subscribe(new ValidateSubscriber(subscriber, this.model, this.form, this.ctx));
  }
}

class ValidateSubscriber<T> extends Subscriber<ValidateStrategy> {
  private readonly $validators = new Map<ValidatorResultSubscriber<T>, Subscription>();

  constructor(
    destination: Subscriber<IMaybeError<T>>,
    private readonly model: BasicModel<T>,
    private readonly form: FormModel,
    private readonly ctx: ValidatorContext,
  ) {
    super(destination);
  }

  childResult(error: IValidateResult<T> | null) {
    if (error === null || !this.destination) {
      return;
    }
    /**
     * one error returned, stop the others
     */
    this._clear();
    this._destinationNext(error);
  }

  childComplete(child: ValidatorResultSubscriber<T>) {
    this._removeChild(child);
  }

  childError(child: ValidatorResultSubscriber<T>, err?: unknown) {
    this._removeChild(child);
    setTimeout(() => {
      throw err;
    }, 0);
  }

  private _removeChild(child: ValidatorResultSubscriber<T>) {
    const $ = this.$validators.get(child);
    this.form.removeWorkingValidator(child.original$);
    if ($) {
      $.unsubscribe();
      this.$validators.delete(child);
    }
  }

  protected _next(strategy: ValidateStrategy) {
    this._clear();
    this._destinationNext(null);
    const value = this.model.getRawValue();
    const { validators, touched } = this.model;
    if (!touched && !(strategy & ValidateStrategy.IgnoreTouched)) {
      return;
    }
    const ignoreAsync = !!(strategy & ValidateStrategy.IgnoreAsync);
    for (let i = 0; i < validators.length; i += 1) {
      const validator = validators[i];
      if (ignoreAsync && validator.isAsync) {
        continue;
      }
      const result = validator(value, this.ctx);
      if (result === null) {
        continue;
      }
      if (isPromise<IValidateResult<T> | null>(result)) {
        if (ignoreAsync) {
          continue;
        }
        const result$ = from(result);
        const subscriber = new ValidatorResultSubscriber(this, result$);
        const $ = result$.subscribe(subscriber);
        this.$validators.set(subscriber, $);
        this.form.addWorkingValidator(result$);
      } else if (isObservable<IValidateResult<T> | null>(result)) {
        if (ignoreAsync) {
          continue;
        }
        const subscriber = new ValidatorResultSubscriber(this, result);
        const $ = result.subscribe(subscriber);
        this.$validators.set(subscriber, $);
        this.form.addWorkingValidator(result);
      } else {
        this._clear();
        this._destinationNext(result);
        return;
      }
    }
  }

  private _clear() {
    this.$validators.forEach($ => $.unsubscribe());
    this.$validators.clear();
  }

  private _destinationNext(error: IMaybeError<T>) {
    this.destination.next && this.destination.next(error);
  }

  unsubscribe() {
    super.unsubscribe();
    this._clear();
  }
}

export function validate<T>(
  model: BasicModel<T>,
  form: FormModel,
  parent: FieldSetModel,
): OperatorFunction<ValidateStrategy, IMaybeError<T>> {
  const ctx = new ValidatorContext(parent, form);
  return function validateOperation(source: Observable<ValidateStrategy>): Observable<IMaybeError<T>> {
    return source.lift(new ValidateOperator(model, form, ctx));
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
