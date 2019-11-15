import { BasicModel, IModel } from './basic';
import { ValidateOption, IMaybeError } from '../validate';
import { Maybe, None } from '../maybe';

const REF_ID = Symbol('ref');

class ModelRef<Value, Parent extends BasicModel<any>, Model extends BasicModel<Value> = BasicModel<Value>>
  implements IModel<Value | null> {
  /**
   * @internal
   */
  [REF_ID]!: boolean;

  /**
   * @internal
   */
  patchedValue: Maybe<Value> = None();

  /**
   * @internal
   */
  constructor(
    private current: Model | null = null,
    public initialValue: Maybe<Value> = None(),
    private owner: Parent | null,
  ) {}

  getModel() {
    return this.current;
  }

  setModel(model: Model | null) {
    if (this.current) {
      this.current.form = null;
      this.current.owner = null;
    }
    this.current = model;
    if (model) {
      model.form = this.owner && this.owner.form;
      model.owner = this;
    }
  }

  getParent() {
    return this.owner;
  }

  dirty() {
    if (!this.current) {
      return false;
    }
    return this.current.dirty();
  }

  touched() {
    if (!this.current) {
      return false;
    }
    return this.current.touched();
  }

  validate(option: ValidateOption = ValidateOption.Default): Promise<void> {
    if (!this.current) {
      return Promise.resolve();
    }
    return this.current.validate(option);
  }

  getRawValue() {
    if (this.current) {
      return this.current.getRawValue();
    }
    return null;
  }

  pristine() {
    if (this.current) {
      return this.current.pristine();
    }
    return true;
  }

  valid() {
    if (this.current) {
      return this.current.valid();
    }
    return true;
  }

  get error() {
    if (this.current) {
      return this.current.error;
    }
    return null;
  }

  set error(error: IMaybeError<Value>) {
    if (this.current) {
      this.current.error = error;
    }
  }

  patchValue(value: Value) {
    if (this.current) {
      this.current.patchValue(value);
    }
  }

  initialize(value: Value) {
    if (this.current) {
      this.current.initialize(value);
    }
  }

  reset() {
    if (this.current) {
      this.current.reset();
    }
  }

  clear() {
    if (this.current) {
      this.current.clear();
    }
  }
}

ModelRef.prototype[REF_ID] = true;

function isModelRef<T, P extends BasicModel<any>, M extends BasicModel<T> = BasicModel<T>>(
  maybeModelRef: any,
): maybeModelRef is ModelRef<T, P, M> {
  return !!(maybeModelRef && maybeModelRef[REF_ID]);
}

export { ModelRef, isModelRef };
