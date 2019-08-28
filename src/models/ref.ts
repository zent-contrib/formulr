import { Subject } from 'rxjs';
import { BasicModel } from './basic';
import { ValidateOption } from '../validate';

interface IModelRefContext<Parent> {
  owner: Parent;
}

class ModelRef<Value, Parent, Model extends BasicModel<Value> = BasicModel<Value>> {
  /**
   * @internal
   */
  isFormulrModelRef!: boolean;

  /**
   * @internal
   */
  patchedValue: Value | null = null;

  readonly validate$ = new Subject<ValidateOption>();

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
    this.validate$.next(option);
  }
}

ModelRef.prototype.isFormulrModelRef = true;

function isModelRef<T, P, M extends BasicModel<T> = BasicModel<T>>(
  maybeModelRef: any,
): maybeModelRef is ModelRef<T, P, M> {
  return !!maybeModelRef.isFormulrModelRef;
}

export { IModelRefContext, ModelRef, isModelRef };
