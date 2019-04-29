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
import { BasicModel, FormModel } from './models';
import { isPromise } from './utils';

export type ValidateEvent<T> = [ValidateStrategy, T];

export interface IValidateResult<T> {
  message?: string;
  expect?: T;
  actual?: T;
  [key: string]: any;
}

export type IMaybeErrors<T> = {
  [key: string]: IValidateResult<T>;
} | null;

export enum ValidateStrategy {
  Normal = 0b0000,
  IgnoreAsync = 0b0010,
  IgnoreTouched = 0b0100,
}

export interface IValidateContext {
  strategy: number;
  form: FormModel;
}

export interface IValidator<Value> {
  (input: Value): ValidatorResult<Value> | null;
  name: string;
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
    private readonly validator: IValidator<T>,
    readonly original$: Observable<IValidateResult<T> | null>,
  ) {}

  next(result: IValidateResult<T> | null) {
    if (this.closed) {
      return;
    }
    this.subscriber.childResult(this.validator, result);
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

class ValidateOperator<T> implements Operator<ValidateEvent<T>, IMaybeErrors<T>> {
  constructor(private readonly model: BasicModel<T>, private readonly form: FormModel) {}

  call(subscriber: Subscriber<IMaybeErrors<T>>, source: Observable<ValidateEvent<T>>) {
    return source.subscribe(new ValidateSubscriber(subscriber, this.model, this.form));
  }
}

class ValidateSubscriber<T> extends Subscriber<ValidateEvent<T>> {
  private readonly $validators = new Map<ValidatorResultSubscriber<T>, Subscription>();

  private errors: IMaybeErrors<T> = null;

  constructor(
    destination: Subscriber<IMaybeErrors<T>>,
    private readonly model: BasicModel<T>,
    private readonly form: FormModel,
  ) {
    super(destination);
  }

  childResult(validator: IValidator<T>, error: IValidateResult<T> | null) {
    if (error === null || !this.destination) {
      return;
    }
    if (!this.errors) {
      this.errors = {};
    }
    this.errors[validator.name] = error;
    this._destinationNext();
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

  protected _next([strategy, value]: ValidateEvent<T>) {
    this._clear();
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
      const result = validator(value);
      if (result === null) {
        continue;
      }
      if (isPromise<IValidateResult<T> | null>(result)) {
        if (ignoreAsync) {
          continue;
        }
        const result$ = from(result);
        const subscriber = new ValidatorResultSubscriber(this, validator, result$);
        const $ = result$.subscribe(subscriber);
        this.$validators.set(subscriber, $);
        this.form.addWorkingValidator(result$);
      } else if (isObservable<IValidateResult<T> | null>(result)) {
        if (ignoreAsync) {
          continue;
        }
        const subscriber = new ValidatorResultSubscriber(this, validator, result);
        const $ = result.subscribe(subscriber);
        this.$validators.set(subscriber, $);
        this.form.addWorkingValidator(result);
      } else {
        this.childResult(validator, result);
      }
    }
    /**
     * this._clear set this.errors to null
     * and if this.$validators is empty
     * means no error is returned
     */
    if (this.errors === null) {
      this._destinationNext();
    }
  }

  private _clear() {
    this.$validators.forEach($ => {
      $.unsubscribe();
    });
    this.$validators.clear();
    this.errors = null;
    this._destinationNext();
  }

  private _destinationNext() {
    this.destination.next && this.destination.next(this.errors);
  }

  unsubscribe() {
    super.unsubscribe();
    this._clear();
  }
}

export function validate<T>(
  model: BasicModel<T>,
  form: FormModel,
): OperatorFunction<ValidateEvent<T>, IMaybeErrors<T>> {
  return function validateOperation(source: Observable<ValidateEvent<T>>): Observable<IMaybeErrors<T>> {
    return source.lift(new ValidateOperator(model, form));
  };
}

export class ErrorSubscriber<T> implements NextObserver<IMaybeErrors<T>> {
  constructor(private readonly model: BasicModel<T>) {}

  next(error: IMaybeErrors<T>) {
    this.model.error = error;
  }
}

export function filterWithCompositing(compositingRef: RefObject<boolean>) {
  return () => !compositingRef.current;
}
