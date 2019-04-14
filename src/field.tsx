import { useCallback, useEffect, useRef } from 'react';
import { merge } from 'rxjs';
import { debounceTime, filter, withLatestFrom, map } from 'rxjs/operators';
import { FieldModel, IErrors, BasicModel, FormStrategy } from './models';
import { useValue$ } from './hooks';
import { withLeft } from './utils';
import { useFormContext } from './context';
import {
  ValidateStrategy,
  validate,
  ErrorSubscriber,
  filterWithCompositing,
  IValidator,
} from './validate';

export interface IFormFieldChildProps<Value> {
  value: Value;
  onChange(value: Value): void;
  onFocus: React.FocusEventHandler;
  onBlur: React.FocusEventHandler;
  onCompositionStart: React.CompositionEventHandler;
  onCompositionEnd: React.CompositionEventHandler;
}

export interface IFieldMeta<Value> {
  pristine: boolean;
  touched: boolean;
  error: IErrors<Value>;
}

export type IUseField<Value> = [
  IFormFieldChildProps<Value>,
  IFieldMeta<Value>,
  FieldModel<Value>
];

export function useField<Value>(
  field: string,
  defaultValue: Value,
  validators?: ReadonlyArray<IValidator<Value>>,
): IUseField<Value>;

export function useField<Value>(field: FieldModel<Value>): IUseField<Value>;

export function useField<Value>(
  field: FieldModel<Value> | string,
  defaultValue?: Value,
  validators?: ReadonlyArray<IValidator<Value>>,
): IUseField<Value> {
  const { parent, strategy, validate$, form } = useFormContext();
  // const { parent } = ctx;
  let model: FieldModel<Value>;
  if (typeof field === 'string') {
    if (strategy !== FormStrategy.View) {
      throw new Error();
    }
    let m = parent.children[field];
    if (!m || !(m instanceof FieldModel)) {
      model = new FieldModel<Value>(defaultValue as Value);
      parent.children[field] = model as BasicModel<unknown>;
    } else {
      model = m;
    }
    model.validators = validators || [];
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
      parent.validate(ValidateStrategy.IgnoreAsync);
    },
    [model, parent],
  );
  const onCompositionStart = useCallback(() => {
    compositingRef.current = true;
  }, [model]);
  const onCompositionEnd = useCallback(() => {
    compositingRef.current = false;
  }, [model]);
  const onBlur = useCallback(() => {
    model.validate();
    parent.validate();
  }, [model, parent]);
  const onFocus = useCallback(() => {
    model.touched = true;
  }, [model]);
  useEffect(() => {
    const $ = merge(
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
    return $.unsubscribe.bind($);
  }, [value$, validate$, localValidate$, model, form]);
  return [
    {
      value,
      onChange,
      onCompositionStart,
      onCompositionEnd,
      onBlur,
      onFocus,
    },
    {
      pristine,
      touched,
      error,
    },
    model,
  ];
}
