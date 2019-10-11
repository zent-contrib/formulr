import { useEffect } from 'react';
import { FieldSetModel, BasicModel, ModelRef } from './models';

export function noop() {}

export function isPlainObject(value: unknown): value is object {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (Object.getPrototypeOf(value) === null) {
    return true;
  }
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(value) === proto;
}

export function removeOnUnmount(
  field: string | BasicModel<any> | ModelRef<any, any>,
  model: BasicModel<any>,
  parent: FieldSetModel,
) {
  useEffect(
    () => () => {
      if (typeof field === 'string' && model.destroyOnUnmount) {
        parent.removeChild(field);
      }
    },
    [field, model, model],
  );
}
