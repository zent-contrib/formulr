import { Subject, BehaviorSubject } from 'rxjs';
import { ValidateOption, IMaybeError, ErrorSubscriber, IValidation, validate, IValidators } from '../validate';
import { switchMap } from 'rxjs/operators';
import { FieldSetModel } from './set';
import { ModelRef } from './ref';
import { FormModel } from './form';
import { Maybe, None } from '../maybe';

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
  /** @internal */
  id: string;
  /** @internal */
  phantomValue!: Value;
  /** @internal */
  readonly validate$ = new Subject<IValidation>();
  /** @internal */
  validators: IValidators<Value> = [];
  /** @internal */
  initialValue: Maybe<Value> = None();
  /** @internal */
  owner: FieldSetModel<any> | ModelRef<any, any, any> | null = null;
  /** @internal */
  form: FormModel<any> | null = null;
  destroyOnUnmount = false;

  /** @internal */
  [MODEL]!: boolean;

  abstract getRawValue(): any;
  abstract getSubmitValue(): any;

  readonly error$ = new BehaviorSubject<IMaybeError<Value>>(null);

  constructor() {
    this.id = `model-${uniqueId}`;
    uniqueId += 1;
    this.validate$.pipe(switchMap(validate(this))).subscribe(new ErrorSubscriber(this));
  }

  abstract pristine(): boolean;
  abstract touched(): boolean;
  abstract dirty(): boolean;
  abstract valid(): boolean;
  abstract patchValue(value: Value): void;
  abstract reset(): void;
  abstract clear(): void;
  abstract initialize(value: Value): void;
  abstract validate(option?: ValidateOption): Promise<any>;

  protected triggerValidate(option: ValidateOption) {
    return new Promise<IMaybeError<Value>>((resolve, reject) => {
      this.validate$.next({
        option,
        resolve,
        reject,
      });
    });
  }

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
