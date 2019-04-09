// import * as React from 'react';
import { useRef, useCallback, useContext } from 'react';
import { FieldModel, ModelType } from './models';
import { useSubscription } from './utils';
import FormContext from './context';

export interface IFormFieldChildProps<Value, ErrorType> {
  value: Value;
  error: ErrorType | null;
  pristine: boolean;
  touched: boolean;
  onChange(value: Value): void;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onCompositionStart: React.CompositionEventHandler;
  onCompositionEnd: React.CompositionEventHandler;
}

export function useField<Value, ErrorType = unknown>(
  field: string,
  defaultValue: Value,
  type?: Function,
): IFormFieldChildProps<Value, ErrorType>;

export function useField<Value, ErrorType = unknown>(
  field: FieldModel<Value, ErrorType>,
): IFormFieldChildProps<Value, ErrorType>;

export function useField<Value, ErrorType = unknown>(
  field: FieldModel<Value, ErrorType> | string,
  defaultValue?: Value,
  type?: Function,
): IFormFieldChildProps<Value, ErrorType> {
  const ctx = useContext(FormContext);
  let model: FieldModel<Value, ErrorType>;
  if (typeof field === 'string') {
    let m = ctx.fields[field];
    if (!m || m.kind !== ModelType.Field) {
      m = new FieldModel(defaultValue, type);
    }
    model = m as FieldModel<Value, ErrorType>;
  } else {
    model = field;
  }
  const { pristine, touched } = model;
  const compositingRef = useRef(false);
  const fieldRef = useRef(model);
  fieldRef.current = model;
  const { value$, error$ } = model;
  const value = useSubscription(value$, value$.getValue());
  const error = useSubscription(error$, error$.getValue());
  const onChange = useCallback(function onChangeImpl(value: Value) {
    fieldRef.current.value = value;
  }, []);
  const onCompositionStart = useCallback(() => {
    compositingRef.current = true;
  }, []);
  const onCompositionEnd = useCallback(() => {
    compositingRef.current = false;
  }, []);
  const onBlur = useCallback(() => {}, []);
  const onFocus = useCallback(() => {
    model.touched = true;
  }, []);
  return {
    value,
    error,
    onChange,
    onCompositionStart,
    onCompositionEnd,
    onBlur,
    onFocus,
    pristine,
    touched,
  };
}
