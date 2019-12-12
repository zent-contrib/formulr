import { BasicModel, IModel } from './basic';
import { ValidateOption, IMaybeError } from '../validate';
import { Maybe, None } from '../maybe';
import { BehaviorSubject } from 'rxjs';

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

  model$: BehaviorSubject<Model | null>;

  /**
   * @internal
   */
  constructor(current: Model | null = null, public initialValue: Maybe<Value> = None(), private owner: Parent | null) {
    this.model$ = new BehaviorSubject(current);
  }

  getModel() {
    return this.model$.getValue();
  }

  setModel(model: Model | null) {
    const current = this.getModel();
    if (current) {
      current.form = null;
      current.owner = null;
    }
    this.model$.next(model);
    if (model) {
      model.form = this.owner && this.owner.form;
      model.owner = this;
    }
  }

  getParent() {
    return this.owner;
  }

  dirty() {
    const current = this.getModel();
    if (!current) {
      return false;
    }
    return current.dirty();
  }

  touched() {
    const current = this.getModel();
    if (!current) {
      return false;
    }
    return current.touched();
  }

  validate(option: ValidateOption = ValidateOption.Default): Promise<void> {
    const current = this.getModel();
    if (!current) {
      return Promise.resolve();
    }
    return current.validate(option);
  }

  getRawValue() {
    return this.getModel()?.getRawValue();
  }

  pristine() {
    const current = this.getModel();
    if (current) {
      return current.pristine();
    }
    return true;
  }

  valid() {
    const current = this.getModel();
    if (current) {
      return current.valid();
    }
    return true;
  }

  get error() {
    return this.getModel()?.error;
  }

  set error(error: IMaybeError<Value>) {
    const current = this.getModel();
    if (current) {
      current.error = error;
    }
  }

  patchValue(value: Value) {
    this.getModel()?.patchValue(value);
  }

  initialize(value: Value) {
    this.getModel()?.initialize(value);
  }

  reset() {
    this.getModel()?.reset();
  }

  clear() {
    this.getModel()?.clear();
  }
}

ModelRef.prototype[REF_ID] = true;

function isModelRef<T, P extends BasicModel<any>, M extends BasicModel<T> = BasicModel<T>>(
  maybeModelRef: any,
): maybeModelRef is ModelRef<T, P, M> {
  return !!(maybeModelRef && maybeModelRef[REF_ID]);
}

export { ModelRef, isModelRef };
