import { BasicModel, IModel } from './basic';
import { ValidateOption, IMaybeError } from '../validate';

interface IModelRefContext<Parent> {
  owner: Parent;
}

class ModelRef<Value, Parent, Model extends BasicModel<Value> = BasicModel<Value>> implements IModel<Value | null> {
  /**
   * @internal
   */
  isFormulrModelRef!: boolean;

  /**
   * @internal
   */
  patchedValue: Value | null = null;

  /**
   * @internal
   */
  constructor(
    private current: Model | null = null,
    public initialValue: Value | null = null,
    private ctx: IModelRefContext<Parent>,
  ) {}

  getModel() {
    return this.current;
  }

  setModel(model: Model | null) {
    this.current = model;
  }

  getParent() {
    return this.ctx.owner;
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

  validate(option: ValidateOption = ValidateOption.Default) {
    if ((option & ValidateOption.FromParent) === 0 || (option & ValidateOption.IncludeChildren) > 0) {
      const model = this.current;
      model && model.validate(option);
    }
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

ModelRef.prototype.isFormulrModelRef = true;

function isModelRef<T, P, M extends BasicModel<T> = BasicModel<T>>(
  maybeModelRef: any,
): maybeModelRef is ModelRef<T, P, M> {
  return !!maybeModelRef.isFormulrModelRef;
}

export { IModelRefContext, ModelRef, isModelRef };
