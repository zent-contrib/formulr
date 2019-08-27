import { Subject } from 'rxjs';
import { BasicModel, isModel } from './basic';
import { ValidateStrategy } from '../validate';

export type $FieldSetValue<Children extends Record<string, BasicModel<any>>> = {
  [Key in keyof Children]: Children[Key]['phantomValue'];
};

export class FieldSetModel<
  Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>
> extends BasicModel<$FieldSetValue<Children>> {
  /** @internal */
  readonly validateChildren$ = new Subject<ValidateStrategy>();
  /** @internal */
  patchedValue: $FieldSetValue<Children> | null = null;

  childRegister$ = new Subject<string>();
  childRemove$ = new Subject<string>();

  /** @internal */
  constructor(public readonly children: Children) {
    super();
  }

  initialize(values: $FieldSetValue<Children>) {
    this.initialValue = values;
    const keys = Object.keys(values);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key] as BasicModel<unknown>;
      if (isModel(child)) {
        child.initialize((values as any)[key]);
      }
    }
  }

  getRawValue(): $FieldSetValue<Children> {
    const value: any = {};
    const childrenKeys = Object.keys(this.children);
    for (let i = 0; i < childrenKeys.length; i++) {
      const key = childrenKeys[i];
      const model = (this.children as any)[key] as BasicModel<unknown>;
      const childValue = model.getRawValue();
      value[key] = childValue;
    }
    return value;
  }

  /** @internal */
  registerChild(name: string, model: BasicModel<unknown>) {
    (this.children as any)[name] = model;
    this.childRegister$.next(name);
  }

  /** @internal */
  removeChild(name: string) {
    delete (this.children as any)[name];
    this.childRemove$.next(name);
  }

  valid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key];
      if (!child.isValid()) {
        return false;
      }
    }
    return true;
  }

  patchValue(value: $FieldSetValue<Children>) {
    this.patchedValue = value;
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key];
      if (child) {
        child.patchValue((value as any)[key]);
      }
    }
  }

  clear() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key];
      if (child) {
        child.clear();
      }
    }
  }

  reset() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key];
      if (child) {
        child.reset();
      }
    }
  }

  validate(strategy = ValidateStrategy.Default) {
    this.validateSelf$.next(strategy);
    if (strategy & ValidateStrategy.IncludeChildren) {
      this.validateChildren$.next(strategy);
    }
  }

  pristine() {
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key];
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
      const child = (this.children as any)[key];
      if (child.touched()) {
        return true;
      }
    }
    return false;
  }

  get<Name extends keyof Children>(name: Name): Children[Name] | undefined | null {
    return this.children[name];
  }
}
