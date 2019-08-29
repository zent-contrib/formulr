import { useEffect, useMemo } from 'react';
import { switchMap, tap } from 'rxjs/operators';

import {
  FieldModel,
  BasicModel,
  FormStrategy,
  FieldSetModel,
  FormModel,
  ModelRef,
  isModelRef,
  isFieldModel,
} from './models';
import { useValue$ } from './hooks';
import { useFormContext } from './context';
import { validate, ErrorSubscriber, IValidator, ValidatorContext } from './validate';
import { removeOnUnmount, orElse, notUndefined } from './utils';
import Scheduler from './scheduler';

export function makeFieldProps<Value>(model: FieldModel<Value>) {
  const { form, parent } = useFormContext();
  const { value } = model;
  const validateOnChangeScheduler = useMemo(() => new Scheduler(() => model.validate()), [model]);
  const props = useMemo(
    () => ({
      value,
      onChange(value: Value) {
        model.value$.next(value);
        if (model.isCompositing) {
          return;
        }
        validateOnChangeScheduler.schedule();
        form.change$.next();
      },
      onCompositionStart() {
        model.isCompositing = true;
      },
      onCompositionEnd() {
        model.isCompositing = false;
      },
      onBlur() {
        model.validate();
        parent.validate();
      },
      onFocus() {
        model._touched = true;
      },
    }),
    [model],
  );
  props.value = value;
  return props;
}

function useModelAndChildProps<Value>(
  field: FieldModel<Value> | ModelRef<Value, any, FieldModel<Value>> | string,
  parent: FieldSetModel,
  strategy: FormStrategy,
  defaultValue: Value | (() => Value),
  form: FormModel,
) {
  return useMemo(() => {
    let model: FieldModel<Value>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.get(field);
      if (!m || !isFieldModel<Value>(m)) {
        const v = orElse<Value>(defaultValue, notUndefined, parent.getPatchedValue(field));
        model = new FieldModel<Value>(v);
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else if (isModelRef<Value, any, FieldModel<Value>>(field)) {
      const m = field.getModel();
      if (!m || isFieldModel<Value>(m)) {
        const v = orElse<Value>(defaultValue, notUndefined, field.patchedValue, field.initialValue);
        model = new FieldModel<Value>(v);
        field.setModel(model);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    return model;
  }, [field, parent, strategy, form]);
}

export function useField<Value>(
  field: string,
  defaultValue: Value,
  validators?: readonly IValidator<Value>[],
): FieldModel<Value>;

export function useField<Value>(field: FieldModel<Value> | ModelRef<Value, any, FieldModel<Value>>): FieldModel<Value>;

export function useField<Value>(
  field: FieldModel<Value> | ModelRef<Value, any, FieldModel<Value>> | string,
  defaultValue?: Value | (() => Value),
  validators: readonly IValidator<Value>[] = [],
): FieldModel<Value> {
  const { parent, strategy, form } = useFormContext();
  const model = useModelAndChildProps(field, parent, strategy, defaultValue!, form);
  const { value$, error$, validate$ } = model;
  useValue$(value$, value$.getValue());
  useValue$(error$, error$.getValue());
  if (typeof field === 'string' || isModelRef(field)) {
    model.validators = validators;
  }
  useEffect(() => {
    const ctx = new ValidatorContext(parent, form);
    const $ = validate$.pipe(tap(() => console.log('validate')), switchMap(validate(model, ctx))).subscribe(new ErrorSubscriber(model));
    return () => $.unsubscribe();
  }, [value$, validate$, model, form, parent]);
  removeOnUnmount(field, model, parent);
  return model;
}
