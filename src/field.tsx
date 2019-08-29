import { useEffect, useRef, useMemo } from 'react';
import { switchMap } from 'rxjs/operators';

import { FieldModel, BasicModel, FormStrategy, FieldSetModel, FormModel, ModelRef, isModelRef } from './models';
import { useValue$ } from './hooks';
import { useFormContext } from './context';
import { validate, ErrorSubscriber, IValidator, ValidatorContext } from './validate';
import { removeOnUnmount, getValueFromModelRefOrDefault, orElse, notUndefined } from './utils';
import Scheduler from './scheduler';

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
  field: FieldModel<Value> | ModelRef<Value, any, FieldModel<Value>> | string,
  parent: FieldSetModel,
  strategy: FormStrategy,
  defaultValue: Value | (() => Value),
  compositingRef: React.MutableRefObject<boolean>,
  form: FormModel,
) {
  return useMemo(() => {
    let model: FieldModel<Value>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.get(field);
      if (!m || !(m instanceof FieldModel)) {
        const v = orElse<any>(notUndefined, parent.getPatchedValue(field), defaultValue);
        model = new FieldModel<Value>(v);
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else if (isModelRef<Value, any, FieldModel<Value>>(field)) {
      const m = field.getModel();
      if (!m) {
        const v = getValueFromModelRefOrDefault(field, defaultValue);
        model = new FieldModel<Value>(v);
        field.setModel(model);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    const { value } = model;
    const validateOnChangeScheduler = new Scheduler(() => model.validate());
    const childProps: IFormFieldChildProps<Value> = {
      value,
      onChange(value: Value) {
        model.value$.next(value);
        validateOnChangeScheduler.schedule();
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
  validators?: readonly IValidator<Value>[],
): IUseField<Value>;

export function useField<Value>(field: FieldModel<Value> | ModelRef<Value, any, FieldModel<Value>>): IUseField<Value>;

export function useField<Value>(
  field: FieldModel<Value> | ModelRef<Value, any, FieldModel<Value>> | string,
  defaultValue?: Value | (() => Value),
  validators: readonly IValidator<Value>[] = [],
): IUseField<Value> {
  const { parent, strategy, form } = useFormContext();
  const compositingRef = useRef(false);
  const { childProps, model } = useModelAndChildProps(
    field,
    parent,
    strategy,
    defaultValue as Value | (() => Value),
    compositingRef,
    form,
  );
  const { value$, error$, validate$ } = model;
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
    const $ = validate$.pipe(switchMap(validate(model, ctx))).subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [value$, validate$, model, form, parent]);
  removeOnUnmount(field, model, parent);
  return [childProps, model];
}
