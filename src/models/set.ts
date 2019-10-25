import { Subject } from 'rxjs';
import { BasicModel, isModel } from './basic';
import { ValidateOption } from '../validate';
import { Some, Maybe, None } from '../maybe';
import { isPlainObject } from '../utils';

type $FieldSetValue<Children extends Record<string, BasicModel<any>>> = {
  [Key in keyof Children]: Children[Key]['phantomValue'];
};

const SET = Symbol('set');

class FieldSetModel<
  Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>
> extends BasicModel<$FieldSetValue<Children>> {
  /**
   * @internal
   */
  [SET]!: boolean;

  /** @internal */
  patchedValue: $FieldSetValue<Children> | null = null;

  childRegister$ = new Subject<string>();
  childRemove$ = new Subject<string>();
  readonly children: Record<string, BasicModel<any>>;

  /** @internal */
  constructor(children: Children) {
    super();
    this.children = children;
  }

  initialize(values: $FieldSetValue<Children>) {
    if (!isPlainObject(values)) {
      return;
    }
    this.initialValue = Some(values);
    const keys = Object.keys(values);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key] as BasicModel<unknown>;
      if (isModel(child)) {
        child.initialize(values[key]);
      }
    }
  }

  /**
   * @internal
   */
  getPatchedValue<T>(name: string): Maybe<T> {
    if (this.patchedValue && name in this.patchedValue) {
      return Some<T>(this.patchedValue[name]);
    }
    return None();
  }

  getRawValue(): $FieldSetValue<Children> {
    const value: any = {};
    const childrenKeys = Object.keys(this.children);
    for (let i = 0; i < childrenKeys.length; i++) {
      const key = childrenKeys[i];
      const model = this.children[key] as BasicModel<unknown>;
      const childValue = model.getRawValue();
      value[key] = childValue;
    }
    return value;
  }

  getSubmitValue() {
    const value: any = {};
    const childrenKeys = Object.keys(this.children);
    for (let i = 0; i < childrenKeys.length; i++) {
      const key = childrenKeys[i];
      const model = this.children[key] as BasicModel<unknown>;
      const childValue = model.getSubmitValue();
      value[key] = childValue;
    }
    return value;
  }

  registerChild(name: string, model: BasicModel<unknown>) {
    model.form = this.form;
    model.owner = this;
    if (this.children[name]) {
      const prevModel = this.children[name];
      prevModel.form = null;
      prevModel.owner = null;
    }
    this.children[name] = model;
    this.childRegister$.next(name);
  }

  removeChild(name: string) {
    const model = this.children[name];
    delete this.children[name];
    model.form = null;
    model.owner = null;
    this.childRemove$.next(name);
    return model;
  }

  valid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (!child.valid()) {
        return false;
      }
    }
    return true;
  }

  patchValue(value: $FieldSetValue<Children>) {
    if (!isPlainObject(value)) {
      return;
    }
    this.patchedValue = value;
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (child) {
        child.patchValue(value[key]);
      }
    }
  }

  clear() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (child) {
        child.clear();
      }
    }
  }

  reset() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (child) {
        child.reset();
      }
    }
  }

  validate(option = ValidateOption.Default): Promise<any> {
    if (option & ValidateOption.IncludeChildrenRecursively) {
      return Promise.all(
        Object.keys(this.children)
          .map(key => this.children[key].validate(option))
          .concat(this.triggerValidate(option)),
      );
    }
    return this.triggerValidate(option);
  }

  pristine() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (!child.pristine()) {
        return false;
      }
    }
    return true;
  }

  dirty() {
    return !this.pristine();
  }

  touched() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (child.touched()) {
        return true;
      }
    }
    return false;
  }

  get<Name extends keyof Children>(name: Name): Children[Name] | undefined | null {
    return this.children[name as string] as any;
  }
}

FieldSetModel.prototype[SET] = true;

function isFieldSetModel<Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>>(
  maybeModel: any,
): maybeModel is FieldSetModel<Children> {
  return !!(maybeModel && maybeModel[SET]);
}

export { FieldSetModel, $FieldSetValue, isFieldSetModel };
