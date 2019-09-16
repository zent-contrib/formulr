import { useEffect } from 'react';
import { FieldSetModel, BasicModel, ModelRef } from './models';

export function notUndefined(value: any): value is any {
  return value !== undefined;
}

export function notNull<T>(value: T) {
  return value !== null;
}

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

export function isPromise<T>(maybePromise: any): maybePromise is Promise<T> {
  if (!maybePromise) {
    return false;
  }
  return typeof maybePromise.then === 'function';
}

export function orElse<T>(
  defaultValue: T | (() => T),
  check: (value: unknown) => value is T,
  ...values: readonly unknown[]
): T {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (check(value)) {
      return value;
    }
  }
  if (typeof defaultValue === 'function') {
    return (defaultValue as (() => T))();
  }
  return defaultValue;
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
