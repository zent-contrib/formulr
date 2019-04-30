export function isPromise<T>(maybePromise: any): maybePromise is Promise<T> {
  return typeof maybePromise.then === 'function';
}
