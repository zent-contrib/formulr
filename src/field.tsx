import { useEffect, useRef, useMemo, RefObject } from 'react';
import { Subject, Observable, Subscriber, NextObserver, BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as Scheduler from 'scheduler';

import { FieldModel, BasicModel, FormStrategy, FieldSetModel } from './models';
import { useValue$ } from './hooks';
import { useFormContext } from './context';
import { ValidateStrategy, validate, ErrorSubscriber, IValidator, ValidatorContext } from './validate';

const {
  unstable_scheduleCallback: scheduleCallback,
  unstable_IdlePriority: IdlePriority,
  unstable_cancelCallback: cancelCallback,
} = Scheduler;

export interface IFormFieldChildProps<Value> {
  value: Value;
  onChange(value: Value): void;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onCompositionStart: React.CompositionEventHandler;
  onCompositionEnd: React.CompositionEventHandler;
}

export type IUseField<Value> = [IFormFieldChildProps<Value>, FieldModel<Value>];

function useModelAndChildProps<Value>(
  field: FieldModel<Value> | string,
  parent: FieldSetModel,
  strategy: FormStrategy,
  defaultValue: Value,
  compositingRef: React.MutableRefObject<boolean>,
) {
  const ret = useMemo(() => {
    let model: FieldModel<Value>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.children[field];
      if (!m || !(m instanceof FieldModel)) {
        const initialValue = parent.initialValue[name] as Value;
        model = new FieldModel<Value>(initialValue || defaultValue);
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    const { value } = model;
    const childProps: IFormFieldChildProps<Value> = {
      value,
      onChange(value: Value) {
        model.pristine = false;
        model.touched = true;
        model.value = value;
      },
      onCompositionStart() {
        compositingRef.current = true;
      },
      onCompositionEnd() {
        compositingRef.current = false;
      },
      onBlur() {
        model.validate();
        parent.validate();
      },
      onFocus() {
        model.touched = true;
      },
    };
    return {
      childProps,
      model,
    };
  }, [field, parent, strategy]);
  const { model } = ret;
  useEffect(() => {
    model.attached = true;
    return () => {
      model.attached = false;
    };
  }, [model]);
  return ret;
}

class ScheduledSubsciber<T> implements NextObserver<T> {
  private node: Scheduler.CallbackNode | null = null;

  constructor(
    private readonly subscriber: Subscriber<ValidateStrategy>,
    private readonly compositingRef: RefObject<boolean>,
  ) {}

  private _notifyNext = () => {
    this.node = null;
    this.subscriber.next(ValidateStrategy.IgnoreAsync);
  };

  next() {
    this.cancel();
    if (this.compositingRef.current) {
      return;
    }
    this.node = scheduleCallback(IdlePriority, this._notifyNext);
  }

  cancel() {
    if (this.node !== null) {
      cancelCallback(this.node);
      this.node = null;
    }
  }
}

class ValidateSubscriber<T> implements NextObserver<ValidateStrategy> {
  constructor(
    private readonly subscriber: Subscriber<ValidateStrategy>,
    private readonly sched: ScheduledSubsciber<T>,
  ) {}

  next(strategy: ValidateStrategy) {
    this.sched.cancel();
    this.subscriber.next(strategy);
  }
}

function mergeValidate$WithValue$<T>(
  validate1$: Subject<ValidateStrategy>,
  validate2$: Subject<ValidateStrategy>,
  value$: BehaviorSubject<T>,
  compositingRef: RefObject<boolean>,
) {
  return new Observable<ValidateStrategy>(subscriber => {
    const sched = new ScheduledSubsciber(subscriber, compositingRef);
    const validateSubscriber = new ValidateSubscriber(subscriber, sched);
    const $1 = validate1$.subscribe(validateSubscriber);
    const $2 = validate2$.subscribe(validateSubscriber);
    const $value = value$.subscribe(sched);
    return () => {
      $1.unsubscribe();
      $2.unsubscribe();
      $value.unsubscribe();
    };
  });
}

export function useField<Value>(
  field: string,
  defaultValue: Value,
  validators?: Array<IValidator<Value>>,
): IUseField<Value>;

export function useField<Value>(field: FieldModel<Value>): IUseField<Value>;

export function useField<Value>(
  field: FieldModel<Value> | string,
  defaultValue?: Value,
  validators: Array<IValidator<Value>> = [],
): IUseField<Value> {
  const { parent, strategy, validate$, form } = useFormContext();
  const compositingRef = useRef(false);
  const { childProps, model } = useModelAndChildProps(field, parent, strategy, defaultValue as Value, compositingRef);
  const { value$, error$, validateSelf$ } = model;
  const value = useValue$(value$, value$.getValue());
  /**
   * ignore returned value
   * user can get the value from model
   */
  useValue$(error$, error$.getValue());
  childProps.value = value;
  if (typeof field === 'string') {
    model.validators = validators;
  }
  useEffect(() => {
    const ctx = new ValidatorContext(parent, form);
    const $ = mergeValidate$WithValue$(validate$, validateSelf$, value$, compositingRef)
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [value$, validate$, validateSelf$, model, form, parent]);
  return [childProps, model];
}
