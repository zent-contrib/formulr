import { useCallback, useEffect, useRef } from 'react';
import { merge } from 'rxjs';
import { debounceTime, filter, withLatestFrom, map } from 'rxjs/operators';
import { FieldModel, IErrors } from './models';
import { useValue$, withLeft } from './utils';
import { useFormContext } from './context';
import {
  ValidateStrategy,
  validate,
  ErrorSubscriber,
  filterWithCompositing,
} from './validate';

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
  const {
    pristine,
    touched,
    value$,
    error$,
    validate$: localValidate$,
  } = model;
  const compositingRef = useRef(false);
  const value = useValue$(value$, value$.getValue());
  const error = useValue$(error$, error$.getValue());
  const onChange = useCallback(
    function onChangeImpl(value: Value) {
      model.value = value;
    },
    [model],
  );
  const onCompositionStart = useCallback(() => {
    compositingRef.current = true;
  }, [model]);
  const onCompositionEnd = useCallback(() => {
    compositingRef.current = false;
  }, [model]);
  const onBlur = useCallback(() => model.validate(), [model]);
  const onFocus = useCallback(() => {
    model.touched = true;
  }, [model]);
  const { validate$, form } = ctx;
  useEffect(() => {
    const $validate = merge(
      validate$.pipe(withLatestFrom(value$)),
      localValidate$.pipe(withLatestFrom(value$)),
      value$.pipe(
        debounceTime(100),
        map(withLeft(ValidateStrategy.IgnoreAsync)),
      ),
    )
      .pipe(
        filter(filterWithCompositing(compositingRef)),
        validate(model, form),
      )
      .subscribe(new ErrorSubscriber(model));
    return $validate.unsubscribe.bind($validate);
  }, [value$, validate$, localValidate$, model, form]);
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
