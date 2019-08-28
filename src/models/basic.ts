import { Subject, BehaviorSubject } from 'rxjs';
import { ValidateStrategy, IValidator, IMaybeError } from '../validate';

abstract class BasicModel<Value> {
  /** @internal */
  phantomValue!: Value;
  /** @internal */
  readonly validateSelf$ = new Subject<ValidateStrategy>();
  /** @internal */
  validators: readonly IValidator<Value>[] = [];
  /** @internal */
  initialValue: Value | undefined = undefined;
  destroyOnUnmount = false;

  /** @internal */
  isFormulrModel!: boolean;

  abstract getRawValue(): Value;

  readonly error$ = new BehaviorSubject<IMaybeError<Value>>(null);

  abstract pristine(): boolean;
  abstract touched(): boolean;
  abstract dirty(): boolean;
  abstract valid(): boolean;
  abstract patchValue(value: Value): void;
  abstract validate(strategy: ValidateStrategy): void;
  abstract reset(): void;
  abstract clear(): void;
  abstract initialize(value: Value): void;

  get error() {
    return this.error$.getValue();
  }

  set error(error: IMaybeError<Value>) {
    this.error$.next(error);
  }
}

BasicModel.prototype.isFormulrModel = true;

function isModel<T>(maybeModel: any): maybeModel is BasicModel<T> {
  return !!maybeModel.isFormulrModel;
}

export { BasicModel, isModel };
