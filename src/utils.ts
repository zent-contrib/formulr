import { useEffect } from 'react';
import { FieldSetModel, BasicModel, ModelRef } from './models';

export function notUndefined(value: any): value is any {
  return value !== undefined;
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

export function orElse<T>(check: (value: unknown) => value is T, ...values: readonly unknown[]): T {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (check(value)) {
      return value;
    }
  }
  throw new Error('last value or `orElse` must match `check`');
}

export function getValueFromModelRefOrDefault<Value, Model extends BasicModel<Value> = BasicModel<Value>>(
  ref: ModelRef<Value, any, Model>,
  defaultValue: Value | (() => Value),
): Value {
  if (ref.patchedValue) {
    return ref.patchedValue;
  }
  if (ref.initialValue) {
    return ref.initialValue;
  }
  if (typeof defaultValue === 'function') {
    return (defaultValue as () => Value)();
  }
  return defaultValue as Value;
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
