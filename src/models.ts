import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IValidator, ValidateStrategy } from './validate';

export interface IError<T> {
  validator: IValidator<T>;
  error: null | string;
}

export type IErrors<T> = Array<IError<T>> | null;

export enum FormStrategy {
  Model,
  View,
}

export type Model<Value> =
  | FieldModel<Value>
  | FieldArrayModel<Value>
  | FieldSetModel<Value>;

export abstract class BasicModel<Value> {
  pristine = true;
  touched = false;
  readonly validate$ = new Subject<ValidateStrategy>();
  readonly change$ = new Subject<never>();
  protected abstract initialValue: Value;
  abstract getRawValue(): Value;

  readonly error$ = new BehaviorSubject<IErrors<Value> | null>(null);

  get error() {
    return this.error$.getValue();
  }

  set error(error: IErrors<Value> | null) {
    this.error$.next(error);
  }

  initialize(value: Value) {
    this.initialValue = value;
    this.touched = false;
    this.pristine = true;
  }

  validate(strategy: ValidateStrategy = ValidateStrategy.Normal) {
    this.validate$.next(strategy);
  }

  validators: Array<IValidator<Value>> = [];
}

export class FieldModel<Value> extends BasicModel<Value> {
  readonly value$: BehaviorSubject<Value>;
  protected initialValue: Value;

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
}

export class FieldSetModel<Value = Record<string, unknown>> extends BasicModel<
  Value
> {
  readonly children: Record<string, BasicModel<unknown>>;
  protected initialValue: Value;

  constructor(defaultValue: Value = {} as Value) {
    super();
    this.children = {};
    this.initialValue = defaultValue;
  }

  getRawValue(): Value {
    const value: any = {};
    for (const key in Object.keys(this.children)) {
      const model = this.children[key];
      const childValue = model.getRawValue();
      value[key] = childValue;
    }
    return value;
  }
}

export interface IFieldArrayChildFactory<Item> {
  (value: Item): BasicModel<Item>;
}

export class FieldArrayModel<Item> extends BasicModel<ReadonlyArray<Item>> {
  readonly models$: BehaviorSubject<ReadonlyArray<BasicModel<Item>>>;
  protected initialValue: ReadonlyArray<Item>;

  constructor(
    private readonly factory: IFieldArrayChildFactory<Item>,
    defaultValue: ReadonlyArray<Item> = [],
  ) {
    super();
    this.models$ = new BehaviorSubject(defaultValue.map(
      factory,
    ) as ReadonlyArray<BasicModel<Item>>);
    this.initialValue = defaultValue;
  }

  get models() {
    return this.models$.getValue();
  }

  set models(models: ReadonlyArray<BasicModel<Item>>) {
    this.models$.next(models);
  }

  getRawValue(): Item[] {
    return this.models$.getValue().map(model => model.getRawValue());
  }

  push(...items: ReadonlyArray<Item>) {
    const nextModels = this.models$.getValue().concat(items.map(this.factory));
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

  unshift(...items: ReadonlyArray<Item>) {
    const nextModels = items.map(this.factory).concat(this.models$.getValue());
    this.models$.next(nextModels);
  }

  splice(start: number, deleteCount?: number): BasicModel<Item>[];

  splice(start: number, deleteCount: number, ...items: ReadonlyArray<Item>) {
    const models = this.models$.getValue().slice();
    const ret = models.splice(start, deleteCount, ...items.map(this.factory));
    this.models$.next(models);
    return ret;
  }
}

export class FormModel extends FieldSetModel {
  private readonly workingValidators = new Set<Observable<unknown>>();
  readonly isValidating$ = new BehaviorSubject(false);

  addWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.add(v);
    const isValidating = this.workingValidators.size > 0;
    if (isValidating !== this.isValidating$.getValue()) {
      this.isValidating$.next(isValidating);
    }
  }

  removeWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.delete(v);
    const isValidating = this.workingValidators.size > 0;
    if (isValidating !== this.isValidating$.getValue()) {
      this.isValidating$.next(isValidating);
    }
  }
}
