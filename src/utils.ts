import { useState, useEffect } from 'react';
import { Observable } from 'rxjs';

export function useValue$<T>(value$: Observable<T>, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  useEffect$(value$, value => {
    setValue(value);
  });
  return value;
}

export function useEffect$<T>(event$: Observable<T>, effect: (e: T) => void) {
  useEffect(() => {
    const $value = event$.subscribe(effect);
    return () => $value.unsubscribe();
  }, [event$]);
}

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

export function noop() {
  return null;
}

export function withLeft<A, B>(b: B): (a: A) => [B, A] {
  return a => [b, a];
}
