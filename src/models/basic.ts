import { Subject, BehaviorSubject } from 'rxjs';
import { ValidateOption, IValidator, IMaybeError } from '../validate';

interface IModel<Value> {
  getRawValue(): any;
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

let uniqueId = 0;

const MODEL = Symbol('model');

abstract class BasicModel<Value> implements IModel<Value> {
  id: string;

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
  [MODEL]!: boolean;

  abstract getRawValue(): any;

  readonly error$ = new BehaviorSubject<IMaybeError<Value>>(null);

  constructor() {
    this.id = `model-${uniqueId}`;
    uniqueId += 1;
  }

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

BasicModel.prototype[MODEL] = true;

function isModel<T>(maybeModel: any): maybeModel is BasicModel<T> {
  return !!(maybeModel && maybeModel[MODEL]);
}

export { IModel, BasicModel, isModel };
