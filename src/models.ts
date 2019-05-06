import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IValidator, ValidateStrategy, IMaybeError } from './validate';

export enum FormStrategy {
  Model,
  View,
}

export abstract class BasicModel<Value> {
  pristine = true;
  touched = false;
  readonly validateSelf$ = new Subject<ValidateStrategy>();
  abstract initialValue: Value;
  abstract getRawValue(): Value;
  attached = false;

  readonly error$ = new BehaviorSubject<IMaybeError<Value>>(null);

  abstract isValid(): boolean;
  abstract patchValue(value: Value): void;
  abstract resetValue(): void;
  abstract validate(strategy: ValidateStrategy): void;

  get error() {
    return this.error$.getValue();
  }

  set error(error: IMaybeError<Value>) {
    this.error$.next(error);
  }

  initialize(value: Value) {
    this.initialValue = value;
    this.touched = false;
    this.pristine = true;
  }

  validators: Array<IValidator<Value>> = [];
}

export class FieldModel<Value> extends BasicModel<Value> {
  readonly value$: BehaviorSubject<Value>;
  initialValue: Value;

  constructor(defaultValue: Value) {
    super();
    this.value$ = new BehaviorSubject(defaultValue);
    this.initialValue = defaultValue;
  }

  get value() {
    return this.value$.getValue();
  }

  set value(value: Value) {
    this.value$.next(value);
  }

  initialize(value: Value) {
    super.initialize(value);
    this.value$.next(value);
  }

  getRawValue() {
    return this.value$.getValue();
  }

  isValid() {
    return this.error$.getValue() === null;
  }

  patchValue(value: Value) {
    this.value$.next(value);
  }

  resetValue() {
    this.pristine = true;
    this.touched = false;
    this.value$.next(this.initialValue);
  }

  validate(strategy = ValidateStrategy.Normal) {
    this.validateSelf$.next(strategy);
  }
}

export class FieldSetModel<Value = Record<string, unknown>> extends BasicModel<Value> {
  readonly children: Record<string, BasicModel<unknown>>;
  readonly validateChildren$ = new Subject<ValidateStrategy>();
  initialValue: Value;

  constructor(defaultValue: Value = {} as Value) {
    super();
    this.children = {};
    this.initialValue = defaultValue;
  }

  getRawValue(): Value {
    const value: any = {};
    const childrenKeys = Object.keys(this.children);
    for (let i = 0; i < childrenKeys.length; i++) {
      const key = childrenKeys[i];
      const model = this.children[key];
      const childValue = model.getRawValue();
      value[key] = childValue;
    }
    return value;
  }

  registerChild(name: string, model: BasicModel<unknown>) {
    this.children[name] = model;
  }

  isValid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (!child.isValid()) {
        return false;
      }
    }
    return true;
  }

  patchValue(value: Value) {
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (child) {
        child.patchValue((value as any)[key]);
      }
    }
  }

  resetValue() {
    this.pristine = true;
    this.touched = false;
    const keys = Object.keys(this.children);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const child = this.children[key];
      if (child) {
        child.resetValue();
      }
    }
  }

  validate(strategy = ValidateStrategy.Normal) {
    this.validateSelf$.next(strategy);
    if (strategy & ValidateStrategy.IncludeChildren) {
      this.validateChildren$.next(strategy);
    }
  }
}

export interface IFieldArrayChildFactory<Item> {
  (value: Item): BasicModel<Item>;
}

export class FieldArrayModel<Item> extends BasicModel<Array<Item>> {
  readonly models$: BehaviorSubject<Array<BasicModel<Item>>>;
  readonly validateChildren$ = new Subject<ValidateStrategy>();
  initialValue: Array<Item>;

  constructor(private readonly factory: IFieldArrayChildFactory<Item>, defaultValue: Array<Item> = []) {
    super();
    this.models$ = new BehaviorSubject<Array<BasicModel<Item>>>(defaultValue.map(factory));
    this.initialValue = defaultValue;
  }

  initialize(values: Array<Item>) {
    super.initialize(values);
    this.models$.next(values.map(this.factory));
  }

  get models() {
    return this.models$.getValue();
  }

  set models(models: Array<BasicModel<Item>>) {
    this.models$.next(models);
  }

  isValid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const models = this.models$.getValue();
    for (let i = 0; i < models.length; i += 1) {
      const model = models[i];
      if (!model.isValid()) {
        return false;
      }
    }
    return true;
  }

  getRawValue(): Item[] {
    return this.models$.getValue().map(model => model.getRawValue());
  }

  patchValue(value: Item[]) {
    const models = this.models$.getValue();
    for (let i = 0; i < value.length; i += 1) {
      if (i >= models.length) {
        break;
      }
      const item = value[i];
      const model = models[i];
      model.patchValue(item);
    }
    if (value.length <= models.length) {
      this.splice(models.length - 1, value.length - models.length);
      return;
    }
    for (let i = models.length; i < value.length; i += 1) {
      const item = value[i];
      this.push(item);
    }
  }

  resetValue() {
    this.initialize(this.initialValue);
  }

  push(...items: Array<Item>) {
    const nextModels: Array<BasicModel<Item>> = this.models$.getValue().concat(items.map(this.factory));
    this.models$.next(nextModels);
  }

  pop() {
    const models = this.models$.getValue().slice();
    const model = models.pop();
    this.models$.next(models);
    return model;
  }

  shift() {
    const models = this.models$.getValue().slice();
    const model = models.shift();
    this.models$.next(models);
    return model;
  }

  unshift(...items: Array<Item>) {
    const nextModels = items.map(this.factory).concat(this.models$.getValue());
    this.models$.next(nextModels);
  }

  splice(start: number, deleteCount?: number): BasicModel<Item>[];

  splice(start: number, deleteCount: number, ...items: Array<Item>) {
    const models = this.models$.getValue().slice();
    const ret = models.splice(start, deleteCount, ...items.map(this.factory));
    this.models$.next(models);
    return ret;
  }

  validate(strategy = ValidateStrategy.Normal) {
    this.validateSelf$.next(strategy);
    if (strategy & ValidateStrategy.IncludeChildren) {
      this.validateChildren$.next(strategy);
    }
  }
}

export class FormModel<T extends object = any> extends FieldSetModel<T> {
  private readonly workingValidators = new Set<Observable<unknown>>();
  readonly isValidating$ = new BehaviorSubject(false);

  addWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.add(v);
    this.updateIsValidating();
  }

  removeWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.delete(v);
    this.updateIsValidating();
  }

  private updateIsValidating() {
    const isValidating = this.workingValidators.size > 0;
    if (isValidating !== this.isValidating$.getValue()) {
      this.isValidating$.next(isValidating);
    }
  }
}
