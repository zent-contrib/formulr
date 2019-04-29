export function isPromise<T>(maybePromise: any): maybePromise is Promise<T> {
  return typeof maybePromise.then === 'function';
}

export function withLeft<A, B>(b: B): (a: A) => [B, A] {
  return a => [b, a];
}
