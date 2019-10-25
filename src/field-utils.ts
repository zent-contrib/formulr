import { useCallback, useMemo, useRef } from 'react';
import {
  unstable_IdlePriority as IdlePriority,
  unstable_scheduleCallback as scheduleCallback,
  CallbackNode,
} from 'scheduler';
import { FieldModel } from './models/field';
import { ValidateOption } from './validate';

export function useMAppend<T>(...fns: ((t: T) => void)[]): (t: T) => void {
  return useCallback((value: T) => {
    for (let i = 0; i < fns.length; i += 1) {
      const f = fns[i];
      f(value);
    }
  }, fns);
}

export function usePipe<T0, T1, T2>(fn0: (t0: T0) => T1, fn1: (t1: T1) => T2): (t0: T0) => T2;
export function usePipe<T0, T1, T2, T3>(fn0: (t0: T0) => T1, fn1: (t1: T1) => T2, fn2: (t2: T2) => T3): (t0: T0) => T3;
export function usePipe<T0, T1, T2, T3, T4>(
  fn0: (t0: T0) => T1,
  fn1: (t1: T1) => T2,
  fn2: (t2: T2) => T3,
  fn3: (t3: T3) => T4,
): (t0: T0) => T4;
export function usePipe<T0, T1, T2, T3, T4, T5>(
  fn0: (t0: T0) => T1,
  fn1: (t1: T1) => T2,
  fn2: (t2: T2) => T3,
  fn3: (t3: T3) => T4,
  fn4: (t4: T4) => T5,
): (t0: T0) => T5;
export function usePipe<T0, T1, T2, T3, T4, T5, T6>(
  fn0: (t0: T0) => T1,
  fn1: (t1: T1) => T2,
  fn2: (t2: T2) => T3,
  fn3: (t3: T3) => T4,
  fn4: (t4: T4) => T5,
  fn5: (t5: T5) => T6,
): (t0: T0) => T6;
export function usePipe<T0, T1, T2, T3, T4, T5, T6, T7>(
  fn0: (t0: T0) => T1,
  fn1: (t1: T1) => T2,
  fn2: (t2: T2) => T3,
  fn3: (t3: T3) => T4,
  fn4: (t4: T4) => T5,
  fn5: (t5: T5) => T6,
  fn6: (t6: T6) => T7,
): (t0: T0) => T7;
export function usePipe<T0, T1, T2, T3, T4, T5, T6, T7, T8>(
  fn0: (t0: T0) => T1,
  fn1: (t1: T1) => T2,
  fn2: (t2: T2) => T3,
  fn3: (t3: T3) => T4,
  fn4: (t4: T4) => T5,
  fn5: (t5: T5) => T6,
  fn6: (t6: T6) => T7,
  fn7: (t7: T7) => T8,
): (t0: T0) => T8;

export function usePipe<T, R>(...args: ((v: any) => any)[]): (v: T) => R {
  return useMemo(() => {
    const fn = args.reduceRight((next, f) => (arg: any) => next(f(arg)), (arg: any) => arg);
    return (t: T): R => fn(t);
  }, args);
}

/**
 * This triggers a validation
 */
export function makeChangeHandler<Value>(model: FieldModel<Value>, option: ValidateOption) {
  const taskRef = useRef<CallbackNode | null>(null);
  const optionRef = useRef(option);
  optionRef.current = option;
  return useCallback(
    (value: Value) => {
      model.value = value;
      if (model.isCompositing) {
        return;
      }
      if (!taskRef.current) {
        taskRef.current = scheduleCallback(IdlePriority, () => {
          taskRef.current = null;
          model.validate(optionRef.current);
        });
      }
    },
    [model],
  );
}

export function useCompositionHandler<Value>(model: FieldModel<Value>) {
  return useMemo(
    () => ({
      onCompositionStart() {
        model.isCompositing = true;
      },
      onCompositionEnd() {
        model.isCompositing = false;
      },
    }),
    [model],
  );
}
