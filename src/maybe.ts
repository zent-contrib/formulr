const SOME = Symbol('some');

export type Maybe<T> = ([T] & { __some: typeof SOME }) | null | undefined;

export const Some = <T>(value: T) => [value] as [T] & { __some: typeof SOME };

export const None = () => null;

export function or<T>(maybe: Maybe<T>, def: T | (() => T)) {
  return maybe ? maybe[0] : typeof def === 'function' ? (def as (() => T))() : def;
}

export function isSome<T>(maybe: Maybe<T>): maybe is [T] & { __some: typeof SOME } {
  return !!maybe;
}

export function get<T>(some: [T] & { __some: typeof SOME }) {
  return some[0];
}
