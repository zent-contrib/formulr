import { useEffect } from 'react';
import { IMaybeError } from './validate';
import { FieldSetModel, BasicModel } from './models';

/**
 * same algorithm as lodash.isPlainObject
 */
export function isPlainObject(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== 'object') {
    return false;
  }
  if (Object.prototype.toString.call(value) !== '[object Object]') {
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
  return typeof maybePromise.then === 'function';
}

export function notNull<T>(value: IMaybeError<T>) {
  return value !== null;
}

export function getValueFromParentOrDefault<T>(parent: FieldSetModel, name: string, defaultValue: T): T {
  if (parent.patchedValue !== null) {
    const patchedValue = parent.patchedValue[name];
    if (patchedValue) {
      return patchedValue as T;
    }
  }
  return defaultValue;
}

export function removeOnUnmount(
  field: string | BasicModel<any>,
  model: BasicModel<any>,
  parent: FieldSetModel<unknown>,
) {
  useEffect(
    () => () => {
      if (typeof field === 'string' && model.destroyOnUnmount) {
        parent.removeChild(field);
      }
    },
    [],
  );
}
