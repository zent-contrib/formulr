import { BehaviorSubject, Subject } from 'rxjs';
import { Field } from './field';
import { FieldSet } from './field-set';
import { FieldArray } from './field-array';
import { IVerifyOption, isPlainObject } from './shared';
import { IFormContext } from './context';

export enum ModelType {
  Field = 'field',
  FieldSet = 'field-set',
  FieldArray = 'field-array',
  Form = 'form',
}

export interface IBasicModel<T extends ModelType, C extends Field<T, unknown> | FieldSet | FieldArray<T>> {
  type: T;
  error$: BehaviorSubject<unknown>;
  error: unknown;
  attach: C | null;
  shadowValue?: unknown;
  verify$: Subject<IVerifyOption>;
  verify(option: IVerifyOption): void;
}

export interface IFieldModel<T> extends IBasicModel<ModelType.Field, Field<T>> {
  value$: BehaviorSubject<T>;
  value: T;
}

export interface IFieldSetModel<T> extends IBasicModel<ModelType.FieldSet, FieldSet> {
  controls: IControls;
  getRawValues(): T;
  setValues(values: unknown): void;
}

export interface IFieldArrayModel<T> extends IBasicModel<ModelType.FieldArray, FieldArray<T>> {
  controls: IControls;
  getRawValues(): T[];
  setValues(values: unknown): void;
  readonly keys$: BehaviorSubject<string[]>;
  keys: string[];
}

export interface IFormModel<T> extends IBasicModel<ModelType.Form, never> {
  controls: IControls;
  getRawValues(): T;
  setValues(values: unknown): void;
  readonly change$: Subject<never>;
}

export type IModels<T> = IFieldModel<T> | IFieldSetModel<T> | IFieldArrayModel<T>;

export type IControls = {
  [key: string]: IModels<unknown>;
};

export function createFieldModel<T>(defaultValue: T): IFieldModel<T> {
  return {
    type: ModelType.Field,
    value$: new BehaviorSubject(defaultValue),
    verify$: new Subject(),
    verify(option: IVerifyOption) {
      this.verify$.next(option);
    },
    get value() {
      return this.value$.getValue();
    },
    set value(value: T) {
      this.value$.next(value);
    },
    error$: new BehaviorSubject<unknown>(null),
    get error() {
      return this.error$.getValue();
    },
    set error(e: unknown) {
      this.error$.next(e);
    },
    attach: null,
    shadowValue: defaultValue,
  };
}

export function createFieldSetModel<T>(defaultValues: T = {} as any): IFieldSetModel<T> {
  return {
    type: ModelType.FieldSet,
    shadowValue: defaultValues,
    verify$: new Subject(),
    verify(option: IVerifyOption) {
      this.verify$.next(option);
    },
    controls: {},
    getRawValues() {
      // TODO
      return {} as any;
    },
    setValues() {},
    error$: new BehaviorSubject<unknown>(null),
    get error() {
      return this.error$.getValue();
    },
    set error(e: unknown) {
      this.error$.next(e);
    },
    attach: null,
  };
}

export function createFieldArrayModel<T>(defaultValues: T[] = []): IFieldArrayModel<T> {
  return {
    type: ModelType.FieldArray,
    controls: {},
    keys$: new BehaviorSubject<string[]>([]),
    verify$: new Subject(),
    verify(option: IVerifyOption) {
      this.verify$.next(option);
    },
    get keys() {
      return this.keys$.getValue();
    },
    set keys(keys: string[]) {
      this.keys$.next(keys);
    },
    getRawValues() {
      // TODO
      return [] as any;
    },
    setValues() {},
    error$: new BehaviorSubject<unknown>(null),
    get error() {
      return this.error$.getValue();
    },
    set error(e: unknown) {
      this.error$.next(e);
    },
    attach: null,
    // shadowValue:
  };
}

export function createFormModel<T>(): IFormModel<T> {
  return {
    type: ModelType.Form,
    shadowValue: {},
    controls: {},
    verify$: new Subject(),
    verify(option: IVerifyOption) {
      this.verify$.next(option);
    },
    getRawValues() {
      // TODO
      return {} as any;
    },
    setValues() {},
    error$: new BehaviorSubject<unknown>(null),
    get error() {
      return this.error$.getValue();
    },
    set error(e: unknown) {
      this.error$.next(e);
    },
    attach: null,
    change$: new Subject<never>(),
  };
}

export function touchField<T>(name: string, defaultValue: T, { controls, getShadowValue }: IFormContext): IFieldModel<T> {
  const model = controls[name];
  if (model && model.type === ModelType.Field) {
    return model as IFieldModel<T>;
  }
  const shadow = getShadowValue()[name];
  const def = shadow != null ? shadow : defaultValue;
  const m = createFieldModel(def);
  controls[name] = m as IModels<unknown>;
  return m;
}

export function touchFieldSet<T>(name: string, { controls, getShadowValue }: IFormContext): IFieldSetModel<T> {
  const model = controls[name];
  if (model && model.type === ModelType.FieldSet) {
    return model as IFieldSetModel<T>;
  }
  const shadowValue = getShadowValue()[name];
  const def = isPlainObject(shadowValue) ? shadowValue : {};
  const m = createFieldSetModel(def);
  controls[name] = m;
  return m;
}

export function touchFieldArray<T>(name: string, { controls, getShadowValue }: IFormContext): IFieldArrayModel<T> {
  const model = controls[name];
  if (model && model.type === ModelType.FieldArray) {
    return model as IFieldArrayModel<T>;
  }
  const shadowValue = getShadowValue()[name];
  const def = Array.isArray(shadowValue) ? shadowValue : [];
  const m = createFieldArrayModel<T>(def);
  controls[name] = m;
  return m;
}
