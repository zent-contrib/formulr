import { IMaybeError } from './validate';

export function isPromise<T>(maybePromise: any): maybePromise is Promise<T> {
  return typeof maybePromise.then === 'function';
}

export function notNull<T>(value: IMaybeError<T>) {
  return value !== null;
}
