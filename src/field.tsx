import { useEffect, useRef, useMemo } from 'react';
import { merge } from 'rxjs';
import { debounceTime, filter, mapTo, switchMap } from 'rxjs/operators';
import { FieldModel, BasicModel, FormStrategy, FieldSetModel } from './models';
import { useValue$ } from './hooks';
import { useFormContext } from './context';
import {
  ValidateStrategy,
  validate,
  ErrorSubscriber,
  filterWithCompositing,
  IValidator,
  ValidatorContext,
} from './validate';

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
        model = new FieldModel<Value>(defaultValue as Value);
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

export function useField<Value>(
  field: string,
  defaultValue: Value,
  validators?: Array<IValidator<Value>>,
): IUseField<Value>;

export function useField<Value>(field: FieldModel<Value>): IUseField<Value>;

export function useField<Value>(
  field: FieldModel<Value> | string,
  defaultValue?: Value,
  validators: ReadonlyArray<IValidator<Value>> = [],
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
    const $ = merge(
      validate$,
      validateSelf$,
      value$.pipe(
        debounceTime(100),
        filter(filterWithCompositing(compositingRef)),
        mapTo(ValidateStrategy.IgnoreAsync),
      ),
    )
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [value$, validate$, validateSelf$, model, form, parent]);
  return [childProps, model];
}
