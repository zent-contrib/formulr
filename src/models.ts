import { BehaviorSubject } from 'rxjs';
import { IValidator } from './validate';

export interface IError<T> {
  validator: IValidator<T>;
  error: null | string;
}

export type IErrors<T> = Array<IError<T>>;

export enum FormStrategy {
  Model,
  View,
}

export enum ModelType {
  Field = 'field',
  FieldSet = 'field-set',
  FieldArray = 'field-array',
  Form = 'form',
}

export type Model<Value> =
  | FieldModel<Value>
  | FieldArrayModel<Value>
  | FieldSetModel<Value>;

export abstract class BasicModel<Type extends ModelType, Value> {
  pristine = true;
  touched = false;

  abstract readonly kind: Type;
  abstract getRawValue(): Value;

  readonly error$ = new BehaviorSubject<IErrors<Value> | null>(null);

  get error() {
    return this.error$.getValue();
  }

  set error(error: IErrors<Value> | null) {
    this.error$.next(error);
  }

  // verify$ = new Subject<IVerifyOption>();

  validators: Array<IValidator<Value>> = [];
}

export type FieldModelRuntimeType =
  | 'number'
  | 'boolean'
  | 'string'
  | 'bigint'
  | Function;

export class FieldModel<Value> extends BasicModel<ModelType.Field, Value> {
  readonly kind: ModelType.Field;
  readonly value$: BehaviorSubject<Value>;
  type: Function;

  constructor(defaultValue: Value, type?: Function) {
    super();
    this.type = type || Object.getPrototypeOf(Object(defaultValue));
    this.kind = ModelType.Field;
    this.value$ = new BehaviorSubject(defaultValue);
  }

  get value() {
    return this.value$.getValue();
  }

  set value(value: Value) {
    this.value$.next(value);
  }

  getRawValue() {
    return this.value$.getValue();
  }
}

export interface IFieldSetDefaultValue {
  [key: string]: unknown;
}

export interface IFieldSetChildren {
  [key: string]: BasicModel<ModelType, unknown>;
}

export class FieldSetModel<Value = IFieldSetDefaultValue> extends BasicModel<
  ModelType.FieldSet,
  Value
> {
  readonly kind: ModelType.FieldSet;
  readonly children: IFieldSetChildren;

  constructor() {
    super();
    this.kind = ModelType.FieldSet;
    this.children = {};
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
  (value: Item): BasicModel<ModelType, Item>;
}

export class FieldArrayModel<Item> extends BasicModel<
  ModelType.FieldArray,
  ReadonlyArray<Item>
> {
  readonly kind: ModelType.FieldArray;
  readonly models$: BehaviorSubject<ReadonlyArray<BasicModel<ModelType, Item>>>;

  constructor(
    private readonly factory: IFieldArrayChildFactory<Item>,
    defaultValue: ReadonlyArray<Item> = [],
  ) {
    super();
    this.kind = ModelType.FieldArray;
    this.models$ = new BehaviorSubject(defaultValue.map(
      factory,
    ) as ReadonlyArray<BasicModel<ModelType, Item>>);
  }

  get models() {
    return this.models$.getValue();
  }

  set models(models: ReadonlyArray<BasicModel<ModelType, Item>>) {
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

  splice(start: number, deleteCount?: number): BasicModel<ModelType, Item>[];

  splice(start: number, deleteCount: number, ...items: ReadonlyArray<Item>) {
    const models = this.models$.getValue().slice();
    const ret = models.splice(start, deleteCount, ...items.map(this.factory));
    this.models$.next(models);
    return ret;
  }
}

// export class FieldSetModel

// export interface IFieldSetModel<T> extends IBasicModel<ModelType.FieldSet, FieldSet> {
//   controls: IControls;
//   setValues(values: unknown): void;
// }

// export interface IFieldArrayModel<T> extends IBasicModel<ModelType.FieldArray, FieldArray<T>> {
//   controls: IControls;
//   setValues(values: unknown): void;
//   readonly keys$: BehaviorSubject<string[]>;
//   keys: string[];
// }

// export interface IFormModel<T> extends IBasicModel<ModelType.Form, never> {
//   controls: IControls;
//   setValues(values: unknown): void;
//   readonly change$: Subject<never>;
// }

// export type IModels<T> = IFieldModel<T> | IFieldSetModel<T> | IFieldArrayModel<T> | IFormModel<T>;

// export type IControls = Dic<IModels<unknown>>;

// function fieldSetGetValues<T>(this: IFieldSetModel<T>) {
//   const values: Dic = {};
//   for (const key of Object.keys(this.controls)) {
//     const value = this.controls[key];
//     if (!value.attach) {
//       continue;
//     }
//     values[key] = value.getRawValue();
//   }
//   return values;
// }

// function fieldSetSetValues<T>(this: IFieldSetModel<T>, values: Dic) {
//   if (!isPlainObject(values)) {
//     throw new Error('FieldSet values must be plain object');
//   }
//   this.shadowValue = values;
//   for (const key of Object.keys(values)) {
//     const value = values[key];
//     const control = this.controls[key];
//     if (!control) {
//       continue;
//     }
//     switch (control.type) {
//       case ModelType.Field:
//         control.value = value;
//         break;
//       case ModelType.FieldArray:
//         try {
//           control.setValues(value);
//         } catch (error) {
//           // noop
//         }
//         break;
//       case ModelType.FieldSet:
//         try {
//           control.setValues(value);
//         } catch (error) {
//           // noop
//         }
//       default:
//         break;
//     }
//   }
// }

// export function createFieldModel<T>(defaultValue: T): IFieldModel<T> {
//   return {
//     type: ModelType.Field,
//     value$: new BehaviorSubject(defaultValue),
//     verify$: new Subject(),
//     verify(option: IVerifyOption) {
//       this.verify$.next(option);
//     },
//     get value() {
//       return this.value$.getValue();
//     },
//     set value(value: T) {
//       this.value$.next(value);
//     },
//     error$: new BehaviorSubject<unknown>(null),
//     get error() {
//       return this.error$.getValue();
//     },
//     set error(e: unknown) {
//       this.error$.next(e);
//     },
//     attach: null,
//     shadowValue: defaultValue,
//     getRawValue() {
//       return this.value;
//     },
//   };
// }

// export function createFieldSetModel<T>(defaultValues: T = {} as any): IFieldSetModel<T> {
//   return {
//     type: ModelType.FieldSet,
//     shadowValue: defaultValues,
//     verify$: new Subject(),
//     verify(option: IVerifyOption) {
//       this.verify$.next(option);
//     },
//     controls: {},
//     getRawValue: fieldSetGetValues,
//     setValues: fieldSetSetValues,
//     error$: new BehaviorSubject<unknown>(null),
//     get error() {
//       return this.error$.getValue();
//     },
//     set error(e: unknown) {
//       this.error$.next(e);
//     },
//     attach: null,
//   };
// }

// export function createFieldArrayModel<T>(defaultValues: T[] = []): IFieldArrayModel<T> {
//   return {
//     type: ModelType.FieldArray,
//     controls: {},
//     keys$: new BehaviorSubject<string[]>([]),
//     verify$: new Subject(),
//     verify(option: IVerifyOption) {
//       this.verify$.next(option);
//     },
//     get keys() {
//       return this.keys$.getValue();
//     },
//     set keys(keys: string[]) {
//       this.keys$.next(keys);
//     },
//     getRawValue() {
//       const keys = this.keys;
//       const values: unknown[] = Array(keys.length);
//       for (let i = 0; i < keys.length; i += 1) {
//         const key = keys[i];
//         const control = this.controls[key];
//         if (control) {
//           values[i] = control.getRawValue();
//         } else {
//           values[i] = undefined;
//         }
//       }
//       return values;
//     },
//     setValues(values: unknown[]) {
//       if (!Array.isArray(values)) {
//         throw new Error('Field Array values must be an Array');
//       }
//       const keys = Array(values.length);
//       const shadowValue: Dic = {};
//       for (let i = 0; i < values.length; i += 1) {
//         keys[i] = '' + i;
//         shadowValue[i] = values[i];
//       }
//       this.shadowValue = shadowValue;
//       this.controls = {};
//       this.keys = keys;
//     },
//     error$: new BehaviorSubject<unknown>(null),
//     get error() {
//       return this.error$.getValue();
//     },
//     set error(e: unknown) {
//       this.error$.next(e);
//     },
//     attach: null,
//   };
// }

// export function createFormModel<T>(): IFormModel<T> {
//   return {
//     type: ModelType.Form,
//     shadowValue: {},
//     controls: {},
//     verify$: new Subject(),
//     verify(option: IVerifyOption) {
//       this.verify$.next(option);
//     },
//     getRawValue: fieldSetGetValues,
//     setValues: fieldSetSetValues,
//     error$: new BehaviorSubject<unknown>(null),
//     get error() {
//       return this.error$.getValue();
//     },
//     set error(e: unknown) {
//       this.error$.next(e);
//     },
//     attach: null,
//     change$: new Subject<never>(),
//   };
// }

// export function touchField<T>(name: string, defaultValue: T, { controls, getShadowValue }: IFormContext, typeKey?: Function): IFieldModel<T> {
//   const model = controls[name];
//   if (model && model.type === ModelType.Field && (!typeKey || Object(model.value) instanceof typeKey)) {
//     return model as IFieldModel<T>;
//   }
//   const shadow = getShadowValue()[name];
//   const def = shadow != null ? shadow : defaultValue;
//   const m = createFieldModel(def);
//   controls[name] = m as IModels<unknown>;
//   return m;
// }

// export function touchFieldSet<T>(name: string, { controls, getShadowValue }: IFormContext): IFieldSetModel<T> {
//   const model = controls[name];
//   if (model && model.type === ModelType.FieldSet) {
//     return model as IFieldSetModel<T>;
//   }
//   const shadowValue = getShadowValue()[name];
//   const def = isPlainObject(shadowValue) ? shadowValue : {};
//   const m = createFieldSetModel(def);
//   controls[name] = m;
//   return m;
// }

// export function touchFieldArray<T>(name: string, { controls, getShadowValue }: IFormContext): IFieldArrayModel<T> {
//   const model = controls[name];
//   if (model && model.type === ModelType.FieldArray) {
//     return model as IFieldArrayModel<T>;
//   }
//   const shadowValue = getShadowValue()[name];
//   const def = Array.isArray(shadowValue) ? shadowValue : [];
//   const m = createFieldArrayModel<T>(def);
//   controls[name] = m as IModels<unknown>;
//   return m;
// }
