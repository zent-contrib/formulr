import { MaybePromise, Nullable } from './typings';

export function isFunction(val: unknown): val is Function {
  return typeof val === 'function';
}

export function maybePromise<R>(async: Nullable<boolean>, result?: R) {
  return async ? Promise.resolve(result) : result;
}

export function then<R>(
  maybePromise: MaybePromise<R>,
  then: (result: R) => unknown
) {
  if (maybePromise instanceof Promise) {
    return maybePromise.then(then);
  } else {
    then(maybePromise);
  }
  return (
    maybePromise instanceof Promise
      ? maybePromise.then(then)
      : then(maybePromise)
  );
}
