import { IMaybeError } from './validate';

export function isPromise<T>(maybePromise: any): maybePromise is Promise<T> {
  return typeof maybePromise.then === 'function';
}

export function isNull<T>(value: IMaybeError<T>) {
  return value === null;
}
