import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IValidator, ValidateStrategy, IMaybeError } from './validate';

export type FieldSetValue<Children> = {
  [key in keyof Children]: Children[key] extends BasicModel<any> ? Children[key]['$$value'] : never
};

export enum FormStrategy {
  Model,
  View,
}

export abstract class BasicModel<Value> {
  /** @internal */
  $$value: Value = (undefined as unknown) as Value;
  /** @internal */
  readonly validateSelf$ = new Subject<ValidateStrategy>();
  /** @internal */
  validators: Array<IValidator<Value>> = [];
  /** @internal */
  initialValue: Value | undefined = undefined;
  destroyOnUnmount = false;

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

export class FieldModel<Value> extends BasicModel<Value> {
  readonly value$: BehaviorSubject<Value>;
  /** @internal */
  _touched = false;

  /** @internal */
  constructor(private readonly defaultValue: Value) {
    super();
    this.value$ = new BehaviorSubject(defaultValue);
  }

  get value() {
    return this.value$.getValue();
  }

  set value(value: Value) {
    this.value$.next(value);
  }

  reset() {
    this.value$.next(this.initialValue === undefined ? this.defaultValue : this.initialValue);
  }

  clear() {
    this.initialValue = undefined;
    this.value$.next(this.defaultValue);
  }

  initialize(value: Value) {
    this.initialValue = value;
    this.value$.next(value);
  }

  getRawValue() {
    return this.value$.getValue();
  }

  valid() {
    return this.error$.getValue() === null;
  }

  patchValue(value: Value) {
    this.value$.next(value);
  }

  validate(strategy = ValidateStrategy.Normal) {
    this.validateSelf$.next(strategy);
  }

  pristine() {
    const value = this.value$.getValue();
    if (this.initialValue !== undefined) {
      return value === this.initialValue;
    }
    return value === this.defaultValue;
  }

  dirty() {
    return !this.pristine();
  }

  touched() {
    return this._touched;
  }
}

export class FieldSetModel<Children = Record<string, BasicModel<unknown>>> extends BasicModel<FieldSetValue<Children>> {
  readonly children: Children;
  /** @internal */
  readonly validateChildren$ = new Subject<ValidateStrategy>();
  /** @internal */
  patchedValue: FieldSetValue<Children> | null = null;

  /** @internal */
  constructor(defaultValue: Children) {
    super();
    this.children = {
      ...defaultValue,
    };
  }

  initialize(values: FieldSetValue<Children>) {
    this.initialValue = values;
    const keys = Object.keys(values);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = (this.children as any)[key] as BasicModel<unknown>;
      if (child instanceof BasicModel) {
        child.initialize((values as any)[key]);
      }
    }
  }

  getRawValue(): FieldSetValue<Children> {
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
  }

  /** @internal */
  removeChild(name: string) {
    delete (this.children as any)[name];
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

  patchValue(value: FieldSetValue<Children>) {
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

  validate(strategy = ValidateStrategy.Normal) {
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
}

export class FieldArrayModel<Item, Child extends BasicModel<Item>> extends BasicModel<Item[]> {
  readonly children$ = new BehaviorSubject<Child[]>([]);
  /** @internal */
  readonly validateChildren$ = new Subject<ValidateStrategy>();

  /** @internal */
  constructor(
    /** @internal */
    private readonly factory: (item: Item) => Child,
    private readonly defaultValue: Item[] = [],
  ) {
    super();
  }

  reset() {
    this.children$.next((this.initialValue || this.defaultValue).map(this.factory));
  }

  clear() {
    this.initialValue = undefined;
    this.children$.next(this.defaultValue.map(this.factory));
  }

  get children() {
    return this.children$.getValue();
  }

  set children(models: Child[]) {
    this.children$.next(models);
  }

  valid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const model = children[i];
      if (!model.valid()) {
        return false;
      }
    }
    return true;
  }

  getRawValue(): Item[] {
    return this.children$.getValue().map(child => child.getRawValue());
  }

  patchValue(value: Item[]) {
    const children = this.children$.getValue();
    for (let i = 0; i < value.length; i += 1) {
      if (i >= children.length) {
        break;
      }
      const item = value[i];
      const model = children[i];
      model.patchValue(item);
    }
    if (value.length <= children.length) {
      this.splice(value.length, children.length - value.length);
      return;
    }
    for (let i = children.length; i < value.length; i += 1) {
      const item = value[i];
      this.push(item);
    }
  }

  initialize(values: Item[]) {
    this.initialValue = values;
    this.children$.next(values.map(this.factory));
  }

  push(...items: Array<Item>) {
    const nextChildren: Child[] = this.children$.getValue().concat(items.map(this.factory));
    this.children$.next(nextChildren);
  }

  pop() {
    const children = this.children$.getValue().slice();
    const child = children.pop();
    this.children$.next(children);
    return child;
  }

  shift() {
    const children = this.children$.getValue().slice();
    const child = children.shift();
    this.children$.next(children);
    return child;
  }

  unshift(...items: Array<Item>) {
    const nextChildren = items.map(this.factory).concat(this.children$.getValue());
    this.children$.next(nextChildren);
  }

  splice(start: number, deleteCount?: number): BasicModel<Item>[];

  splice(start: number, deleteCount: number, ...items: Array<Item>) {
    const children = this.children$.getValue().slice();
    const ret = children.splice(start, deleteCount, ...items.map(this.factory));
    this.children$.next(children);
    return ret;
  }

  validate(strategy = ValidateStrategy.Normal) {
    this.validateSelf$.next(strategy);
    if (strategy & ValidateStrategy.IncludeChildren) {
      this.validateChildren$.next(strategy);
    }
  }

  pristine() {
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.dirty()) {
        return false;
      }
    }
    return true;
  }

  dirty() {
    return !this.pristine();
  }

  touched() {
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.touched()) {
        return true;
      }
    }
    return false;
  }
}

export class FormModel<T> extends FieldSetModel<T> {
  /** @internal */
  private readonly workingValidators = new Set<Observable<unknown>>();
  readonly isValidating$ = new BehaviorSubject(false);
  readonly change$ = new Subject<void>();

  /** @internal */
  addWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.add(v);
    this.updateIsValidating();
  }

  /** @internal */
  removeWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.delete(v);
    this.updateIsValidating();
  }

  /** @internal */
  private updateIsValidating() {
    const isValidating = this.workingValidators.size > 0;
    if (isValidating !== this.isValidating$.getValue()) {
      this.isValidating$.next(isValidating);
    }
  }
}
