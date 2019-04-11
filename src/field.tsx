// import * as React from 'react';
import { useRef, useCallback, useEffect } from 'react';
import { merge } from 'rxjs';
import { debounceTime, withLatestFrom, map } from 'rxjs/operators';
import { FieldModel, IErrors } from './models';
import { useValue$, withLeft } from './utils';
import { useFormContext } from './context';
import { ValidateStrategy, validate, ErrorSubscriber } from './validate';
// import { merge, never } from 'rxjs';
// import { switchMap, debounceTime } from 'rxjs/operators';

export interface IFormFieldChildProps<Value> {
  value: Value;
  error: IErrors<Value> | null;
  pristine: boolean;
  touched: boolean;
  onChange(value: Value): void;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onCompositionStart: React.CompositionEventHandler;
  onCompositionEnd: React.CompositionEventHandler;
}

export function useField<Value>(
  field: string,
  defaultValue: Value,
): IFormFieldChildProps<Value>;

export function useField<Value>(
  field: FieldModel<Value>,
): IFormFieldChildProps<Value>;

export function useField<Value>(
  field: FieldModel<Value> | string,
  defaultValue?: Value,
): IFormFieldChildProps<Value> {
  const ctx = useFormContext();
  let model: FieldModel<Value>;
  if (typeof field === 'string') {
    let m = ctx.parent.children[field];
    if (!m || !(m instanceof FieldModel)) {
      model = new FieldModel<Value>(defaultValue as Value);
    }
    model = m as FieldModel<Value>;
  } else {
    model = field;
  }
  const { pristine, touched } = model;
  const compositingRef = useRef(false);
  const fieldRef = useRef(model);
  fieldRef.current = model;
  const { value$, error$ } = model;
  const value = useValue$(value$, value$.getValue());
  const error = useValue$(error$, error$.getValue());
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
  const { validate$, form } = ctx;
  useEffect(() => {
    const $validate = merge(
      validate$.pipe(withLatestFrom(value$)),
      value$.pipe(
        debounceTime(100),
        map(withLeft(ValidateStrategy.Normal)),
      ),
    )
      .pipe(validate(model, form))
      .subscribe(new ErrorSubscriber(model));
    return $validate.unsubscribe.bind($validate);
  }, [value$, validate$, model, form]);
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
