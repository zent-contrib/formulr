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
import { BasicModel, IErrors, FormModel } from './models';
import { isPromise } from './utils';

export type ValidateEvent<T> = [ValidateStrategy, T];

export enum ValidateStrategy {
  Normal,
  IgnoreAsync,
}

export interface IValidateContext {
  strategy: ValidateStrategy;
  form: FormModel;
}

export interface IValidator<Value> {
  (input: Value): ValidatorResult;
  name: string | symbol;
}

export type ValidatorResult =
  | string
  | null
  | Promise<string | null>
  | Observable<string | null>;

class ValidatorResultSubscriber<T> implements Observer<string | null> {
  closed = false;

  constructor(
    private readonly subscriber: ValidateSubscriber<T>,
    private readonly validator: IValidator<T>,
    readonly original$: Observable<string | null>,
  ) {}

  next(result: string | null) {
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

class ValidateOperator<T> implements Operator<ValidateEvent<T>, IErrors<T>> {
  constructor(
    private readonly model: BasicModel<T>,
    private readonly form: FormModel,
  ) {}

  call(
    subscriber: Subscriber<IErrors<T>>,
    source: Observable<ValidateEvent<T>>,
  ) {
    return source.subscribe(
      new ValidateSubscriber(subscriber, this.model, this.form),
    );
  }
}

class ValidateSubscriber<T> extends Subscriber<ValidateEvent<T>> {
  private readonly $validators = new Map<
    ValidatorResultSubscriber<T>,
    Subscription
  >();

  private errors: IErrors<T> | null = null;

  constructor(
    destination: Subscriber<IErrors<T>>,
    private readonly model: BasicModel<T>,
    private readonly form: FormModel,
  ) {
    super(destination);
  }

  childResult(validator: IValidator<T>, error: null | string) {
    if (error === null || !this.destination) {
      return;
    }
    if (!this.errors) {
      this.errors = [];
    }
    this.errors.push({
      validator,
      error,
    });
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
    const validators = this.model.validators;
    for (const validator of validators) {
      const result = validator(value);
      const ignoreAsync = strategy === ValidateStrategy.IgnoreAsync;
      if (result === null) {
        continue;
      }
      if (isPromise<string | null>(result)) {
        if (ignoreAsync) {
          continue;
        }
        const result$ = from(result);
        const subscriber = new ValidatorResultSubscriber(
          this,
          validator,
          result$,
        );
        const $ = result$.subscribe(subscriber);
        this.$validators.set(subscriber, $);
        this.form.addWorkingValidator(result$);
      } else if (isObservable<string | null>(result)) {
        if (ignoreAsync) {
          continue;
        }
        const subscriber = new ValidatorResultSubscriber(
          this,
          validator,
          result,
        );
        const $ = result.subscribe(subscriber);
        this.$validators.set(subscriber, $);
        this.form.addWorkingValidator(result);
      } else {
        this.childResult(validator, result);
      }
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
): OperatorFunction<[ValidateStrategy, T], IErrors<T>> {
  return function validateOperation(
    source: Observable<[ValidateStrategy, T]>,
  ): Observable<IErrors<T>> {
    return source.lift(new ValidateOperator(model, form));
  };
}

export class ErrorSubscriber<T> implements NextObserver<IErrors<T>> {
  constructor(private readonly model: BasicModel<T>) {}

  next(error: IErrors<T>) {
    this.model.error = error;
  }
}
