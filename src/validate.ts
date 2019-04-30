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
}

export interface IValidateContext {
  strategy: number;
  form: FormModel;
}

export interface IValidator<Value> {
  (input: Value): ValidatorResult<Value> | null;
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

class ValidateOperator<T> implements Operator<ValidateEvent<T>, IMaybeError<T>> {
  constructor(private readonly model: BasicModel<T>, private readonly form: FormModel) {}

  call(subscriber: Subscriber<IMaybeError<T>>, source: Observable<ValidateEvent<T>>) {
    return source.subscribe(new ValidateSubscriber(subscriber, this.model, this.form));
  }
}

class ValidateSubscriber<T> extends Subscriber<ValidateEvent<T>> {
  private readonly $validators = new Map<ValidatorResultSubscriber<T>, Subscription>();

  constructor(
    destination: Subscriber<IMaybeError<T>>,
    private readonly model: BasicModel<T>,
    private readonly form: FormModel,
  ) {
    super(destination);
  }

  childResult(error: IValidateResult<T> | null) {
    if (this.error !== null || error === null || !this.destination) {
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

  protected _next([strategy, value]: ValidateEvent<T>) {
    this._clear();
    this._destinationNext(null);
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

export function validate<T>(model: BasicModel<T>, form: FormModel): OperatorFunction<ValidateEvent<T>, IMaybeError<T>> {
  return function validateOperation(source: Observable<ValidateEvent<T>>): Observable<IMaybeError<T>> {
    return source.lift(new ValidateOperator(model, form));
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
