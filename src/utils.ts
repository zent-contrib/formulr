import { useEffect } from 'react';
import { FieldSetModel, AbstractModel, ModelRef } from './models';

export function noop() {
  // noop
}

export function last<T>(arr: T[]) {
  return arr.length ? arr[arr.length - 1] : null;
}

export const id = <T>(it: T) => it;

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

export function removeOnUnmount<Model extends AbstractModel<any>>(
  field: string | AbstractModel<any> | ModelRef<any, any, Model>,
  model: AbstractModel<any>,
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

export type $MergeProps<T> = (T extends any ? (t: T) => void : never) extends (r: infer R) => void ? R : never;

export function memoize<T, R>(func: (t: T) => R): (t: T) => R {
  let prev: T;
  let value: R;
  let initial = false;
  return arg => {
    if (!initial || prev !== arg) {
      initial = true;
      prev = arg;
      value = func(arg);
    }
    return value;
  };
}
