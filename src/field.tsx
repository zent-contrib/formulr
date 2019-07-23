import { useEffect, useRef, useMemo } from 'react';
import { merge } from 'rxjs';
import { switchMap, audit, mapTo } from 'rxjs/operators';
import * as Scheduler from 'scheduler';

import { FieldModel, BasicModel, FormStrategy, FieldSetModel, FormModel } from './models';
import { useValue$ } from './hooks';
import { useFormContext } from './context';
import { ValidateStrategy, validate, ErrorSubscriber, IValidator, ValidatorContext } from './validate';
import { getValueFromParentOrDefault, removeOnUnmount } from './utils';

const { unstable_scheduleCallback: scheduleCallback, unstable_IdlePriority: IdlePriority } = Scheduler;

export interface IFormFieldChildProps<Value> {
  value: Value;
  onChange(value: Value): void;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onCompositionStart: React.CompositionEventHandler;
  onCompositionEnd: React.CompositionEventHandler;
}

function batch() {
  return new Promise(resolve =>
    scheduleCallback(IdlePriority, resolve, {
      delay: 100,
    }),
  );
}

export type IUseField<Value> = [IFormFieldChildProps<Value>, FieldModel<Value>];

function useModelAndChildProps<Value>(
  field: FieldModel<Value> | string,
  parent: FieldSetModel,
  strategy: FormStrategy,
  defaultValue: Value | (() => Value),
  compositingRef: React.MutableRefObject<boolean>,
  form: FormModel<unknown>,
) {
  return useMemo(() => {
    let model: FieldModel<Value>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.get(field);
      if (!m || !(m instanceof FieldModel)) {
        const v = getValueFromParentOrDefault(parent, field, defaultValue);
        model = new FieldModel<Value>(v);
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
        model.value$.next(value);
        model.change$.next(value);
        form.change$.next();
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
        model._touched = true;
      },
    };
    return {
      childProps,
      model,
    };
  }, [field, parent, strategy, form]);
}

export function useField<Value>(
  field: string,
  defaultValue: Value,
  validators?: Array<IValidator<Value>>,
): IUseField<Value>;

export function useField<Value>(field: FieldModel<Value>): IUseField<Value>;

export function useField<Value>(
  field: FieldModel<Value> | string,
  defaultValue?: Value | (() => Value),
  validators: Array<IValidator<Value>> = [],
): IUseField<Value> {
  const { parent, strategy, validate$, form } = useFormContext();
  const compositingRef = useRef(false);
  const { childProps, model } = useModelAndChildProps(
    field,
    parent,
    strategy,
    defaultValue as Value | (() => Value),
    compositingRef,
    form,
  );
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
    const $ = merge(
      validate$,
      validateSelf$,
      model.change$.pipe(
        mapTo(ValidateStrategy.Default),
        audit(batch),
      ),
    )
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [value$, validate$, validateSelf$, model, form, parent]);
  removeOnUnmount(field, model, parent);
  return [childProps, model];
}
