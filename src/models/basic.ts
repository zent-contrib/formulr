import { Subject, BehaviorSubject } from 'rxjs';
import { ValidateOption, IValidator, IMaybeError } from '../validate';

interface IModel<Value> {
  getRawValue(): Value;
  pristine(): boolean;
  touched(): boolean;
  dirty(): boolean;
  valid(): boolean;
  patchValue(value: Value): void;
  validate(strategy: ValidateOption): void;
  reset(): void;
  clear(): void;
  initialize(value: Value): void;
  error: IMaybeError<Value>;
}

abstract class BasicModel<Value> implements IModel<Value> {
  /** @internal */
  phantomValue!: Value;
  /** @internal */
  readonly validate$ = new Subject<ValidateOption>();
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
  abstract validate(strategy: ValidateOption): void;
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

export { IModel, BasicModel, isModel };
