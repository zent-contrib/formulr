import { useEffect } from 'react';
import { FieldSetModel, BasicModel } from './models';

export function isPromise<T>(maybePromise: any): maybePromise is Promise<T> {
  if (!maybePromise) {
    return false;
  }
  return typeof maybePromise.then === 'function';
}

export function getValueFromParentOrDefault<T>(parent: FieldSetModel, name: string, defaultValue: T | (() => T)): T {
  if (parent.patchedValue !== null) {
    const patchedValue = parent.patchedValue[name];
    if (patchedValue) {
      return patchedValue as T;
    }
  }
  if (typeof defaultValue === 'function') {
    return (defaultValue as (() => T))();
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
