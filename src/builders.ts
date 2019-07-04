import { BasicModel, FieldSetModel, FieldModel, FieldArrayModel, FormModel, FieldSetValue } from './models';
import { IValidator } from './validate';

export function field<T>(defaultValue: T, validators: IValidator<T>[] = []) {
  const model = new FieldModel(defaultValue);
  model.validators = validators;
  return model;
}

export function set<Children>(children: Children, validators: IValidator<FieldSetValue<Children>>[] = []) {
  const model = new FieldSetModel<Children>(children);
  model.validators = validators;
  return model;
}

export function array<Item, Child extends BasicModel<Item>>(
  factory: (item: Item) => Child,
  validators: IValidator<Item[]>[] = [],
  defaultChildren: Item[] = [],
) {
  const model = new FieldArrayModel(factory, defaultChildren);
  model.validators = validators;
  return model;
}

export function form<Children>(children: Children, validators: IValidator<FieldSetValue<Children>>[] = []) {
  const model = new FormModel<Children>(children);
  model.validators = validators;
  return model;
}
