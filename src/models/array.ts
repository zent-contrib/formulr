import { Subject, BehaviorSubject } from 'rxjs';
import { BasicModel, isModel } from './basic';
import { ValidateStrategy } from '../validate';
import { ModelRef, isModelRef } from './ref';

export type FieldArrayChild<Item, Child extends BasicModel<Item>> =
  | Child
  | ModelRef<Item, FieldArrayModel<Item, Child>>;

export class FieldArrayModel<Item, Child extends BasicModel<Item>> extends BasicModel<Array<Item | null>> {
  readonly children$ = new BehaviorSubject<FieldArrayChild<Item, Child>>([]);
  /** @internal */
  readonly validateChildren$ = new Subject<ValidateStrategy>();

  /** @internal */
  constructor(private readonly defaultValue: Item[] = []) {
    super();
  }

  reset() {
    // this.children$.next((this.initialValue || this.defaultValue).map(this.factory));
  }

  clear() {
    this.initialValue = undefined;
    // this.children$.next(this.defaultValue.map(this.factory));
  }

  get children() {
    return this.children$.getValue();
  }

  valid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (isModelRef(child)) {
        const model = child.getModel();
        if (!model || !model.valid()) {
          return false;
        }
      } else if (isModel(child) && !child.valid()) {
        return false;
      }
    }
    return true;
  }

  getRawValue(): Array<Item | null> {
    return this.children$.getValue().map(child => {
      if (isModelRef<Item, this, Child>(child)) {
        const model = child.getModel();
        return model ? model.getRawValue() : null;
      } else if (isModel<Item>(child)) {
        return child.getRawValue();
      }
      return null;
    });
  }

  patchValue(value: Item[]) {
    const children = this.children$.getValue();
    for (let i = 0; i < value.length; i += 1) {
      if (i >= children.length) {
        break;
      }
      const item = value[i];
      const model = children[i];
      if (isModelRef(model)) {
        const m = model.getModel();
        m && m.patchValue(item);
      } else if (isModel(model)) {
        model.patchValue(item);
      }
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
    // this.children$.next(values.map(this.factory));
  }

  push(...items: Array<Item>) {
    // const nextChildren: Child[] = this.children$.getValue().concat(items.map(this.factory));
    // this.children$.next(nextChildren);
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
    // const nextChildren = items.map(this.factory).concat(this.children$.getValue());
    // this.children$.next(nextChildren);
  }

  splice(start: number, deleteCount?: number): BasicModel<Item | null>[];

  splice(start: number, deleteCount: number, ...items: Array<Item>): BasicModel<Item | null>[] {
    // const children = this.children$.getValue().slice();
    // const ret = children.splice(start, deleteCount, ...items.map(this.factory));
    // this.children$.next(children);
    // return ret;
    return [];
  }

  validate(strategy = ValidateStrategy.Default) {
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
