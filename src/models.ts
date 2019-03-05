import { BehaviorSubject, Subject } from 'rxjs';
import { Field } from './field';
import { FieldSet } from './field-set';
import { FieldArray } from './field-array';
import { IVerifyOption, isPlainObject } from './shared';
import { IFormContext } from './context';

export interface Dic<T = unknown> {
  [key: string]: T;
}

export enum ModelType {
  Field = 'field',
  FieldSet = 'field-set',
  FieldArray = 'field-array',
  Form = 'form',
}

export interface IBasicModel<T extends ModelType, C> {
  type: T;
  error$: BehaviorSubject<unknown>;
  error: unknown;
  attach: C | null;
  shadowValue?: unknown;
  verify$: Subject<IVerifyOption>;
  verify(option: IVerifyOption): void;
  getRawValue(): any;
}

export interface IFieldModel<T> extends IBasicModel<ModelType.Field, Field<T, unknown>> {
  value$: BehaviorSubject<T>;
  value: T;
}

export interface IFieldSetModel<T> extends IBasicModel<ModelType.FieldSet, FieldSet> {
  controls: IControls;
  setValues(values: unknown): void;
}

export interface IFieldArrayModel<T> extends IBasicModel<ModelType.FieldArray, FieldArray<T>> {
  controls: IControls;
  setValues(values: unknown): void;
  readonly keys$: BehaviorSubject<string[]>;
  keys: string[];
}

export interface IFormModel<T> extends IBasicModel<ModelType.Form, never> {
  controls: IControls;
  setValues(values: unknown): void;
  readonly change$: Subject<never>;
}

export type IModels<T> = IFieldModel<T> | IFieldSetModel<T> | IFieldArrayModel<T> | IFormModel<T>;

export type IControls = Dic<IModels<unknown>>;

function fieldSetGetValues<T>(this: IFieldSetModel<T>) {
  const values: Dic = {};
  for (const key of Object.keys(this.controls)) {
    const value = this.controls[key];
    if (!value.attach) {
      continue;
    }
    values[key] = value.getRawValue();
  }
  return values;
}

function fieldSetSetValues<T>(this: IFieldSetModel<T>, values: Dic) {
  if (!isPlainObject(values)) {
    throw new Error('FieldSet values must be plain object');
  }
  this.shadowValue = values;
  for (const key of Object.keys(values)) {
    const value = values[key];
    const control = this.controls[key];
    if (!control) {
      continue;
    }
    switch (control.type) {
      case ModelType.Field:
        control.value = value;
        break;
      case ModelType.FieldArray:
        try {
          control.setValues(value);
        } catch (error) {
          // noop
        }
        break;
      case ModelType.FieldSet:
        try {
          control.setValues(value);
        } catch (error) {
          // noop
        }
      default:
        break;
    }
  }
}

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
    getRawValue() {
      return this.value;
    },
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
    getRawValue: fieldSetGetValues,
    setValues: fieldSetSetValues,
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
    getRawValue() {
      const keys = this.keys;
      const values: unknown[] = Array(keys.length);
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        const control = this.controls[key];
        if (control) {
          values[i] = control.getRawValue();
        } else {
          values[i] = undefined;
        }
      }
      return values;
    },
    setValues(values: unknown[]) {
      if (!Array.isArray(values)) {
        throw new Error('Field Array values must be an Array');
      }
      const keys = Array(values.length);
      const shadowValue: Dic = {};
      for (let i = 0; i < values.length; i += 1) {
        keys[i] = '' + i;
        shadowValue[i] = values[i];
      }
      this.shadowValue = shadowValue;
      this.controls = {};
      this.keys = keys;
    },
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

export function createFormModel<T>(): IFormModel<T> {
  return {
    type: ModelType.Form,
    shadowValue: {},
    controls: {},
    verify$: new Subject(),
    verify(option: IVerifyOption) {
      this.verify$.next(option);
    },
    getRawValue: fieldSetGetValues,
    setValues: fieldSetSetValues,
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

export function touchField<T>(name: string, defaultValue: T, { controls, getShadowValue }: IFormContext, typeKey?: Function): IFieldModel<T> {
  const model = controls[name];
  if (model && model.type === ModelType.Field && (!typeKey || Object(model.value) instanceof typeKey)) {
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
  controls[name] = m as IModels<unknown>;
  return m;
}
