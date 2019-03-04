import { Subject, Observable, never, from, isObservable, of, Subscription } from 'rxjs';
import { ReactNode } from 'react';
import { IFormContext } from './context';

export type ErrorType = unknown;

export interface IFormFieldChildProps<T, E = T> {
  value: T;
  error: ErrorType;
  pristine: boolean;
  touched: boolean;
  onChange(value: E): void;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onCompositionStart: React.CompositionEventHandler;
  onCompositionEnd: React.CompositionEventHandler;
}

export type FormChildren<T, E = T> = (props: IFormFieldChildProps<T, E>) => ReactNode;

export interface IVerifyOption {
  source: string;
}

export function noop() {
  return null;
}

export interface IValidationState {
  readonly validating: Set<Subscription>;
}

export interface ITracedSwitchMapContext extends IValidationState {
  readonly error$: Subject<ErrorType>;
}

export const tracedSwitchMap = <T>(ctx: ITracedSwitchMapContext, mapper: (v: T) => Observable<unknown>) => (source: Observable<T>) =>
  new Observable<unknown>(observer => {
    let inner: Subscription | null = null;
    function disposeInner() {
      if (inner) {
        ctx.validating.delete(inner);
        inner.unsubscribe();
        inner = null;
      }
    }
    const s = source.subscribe(v => {
      const next = mapper(v);
      disposeInner();
      inner = next.subscribe({
        next(r) {
          observer.next(r);
        },
        error(e) {
          ctx.error$.next(e);
          disposeInner();
        },
        complete() {
          disposeInner();
        },
      });
      ctx.validating.add(inner);
    });
    return () => {
      s.unsubscribe();
      disposeInner();
    };
  });

export type Validator<T> = (value: T, verifyOption: IVerifyOption) => unknown | Promise<unknown> | Observable<unknown>;

export function noopValidator(): Observable<unknown> {
  return never();
}

export interface IWithContext {
  context?: IFormContext;
}

export function ensureContext(comp: IWithContext): IFormContext {
  if (!comp.context) {
    throw new Error(`${comp.constructor.name} must be used under Form`);
  }
  return comp.context;
}

export function makeTrace(comp: IWithContext): ITracedSwitchMapContext {
  return {
    validating: new Set(),
    get error$() {
      const { form } = ensureContext(comp);
      return form.error$;
    },
  };
}

export function isPromise(maybePromise: { then?: Function }): maybePromise is Promise<unknown> {
  return typeof maybePromise.then === 'function';
}

export function mapValidatorResult(a: unknown): Observable<unknown> {
  if (typeof a === 'object' && a !== null && isPromise(a)) {
    return from(a);
  } else if (isObservable(a)) {
    return a;
  }
  return of(a);
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
