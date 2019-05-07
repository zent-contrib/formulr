import { BasicModel, FieldSetModel, FieldModel, IFieldArrayChildFactory, FieldArrayModel, FormModel } from './models';
import { IValidator } from './validate';

type Children<T extends object> = { [key in keyof T]: BasicModel<T[key]> };

export function set<T extends object>(children: Children<T>, validators: IValidator<T>[] = []) {
  const fieldSet = new FieldSetModel<T>();
  Object.assign(fieldSet.children, children);
  fieldSet.validators = validators;
  return fieldSet;
}

export function field<T>(defaultValue: T, validators: IValidator<T>[] = []) {
  const field = new FieldModel(defaultValue);
  field.validators = validators;
  return field;
}

export interface IFieldArrayBuilderOptions<T> {
  factory: IFieldArrayChildFactory<T>;
  validators?: IValidator<T[]>[];
  defaultValue?: T[];
}

export function array<T>({ factory, validators = [], defaultValue }: IFieldArrayBuilderOptions<T>) {
  const model = new FieldArrayModel(factory, defaultValue);
  model.validators = validators;
  return model;
}

export function form<T extends object>(children: Children<T>, validators: IValidator<T>[] = []) {
  const form = new FormModel<T>();
  Object.assign(form.children, children);
  form.validators = validators;
  return form;
}
