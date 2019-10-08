import { useMemo, useRef, useEffect } from 'react';
import {
  unstable_scheduleCallback as scheduleCallback,
  unstable_cancelCallback as cancelCallback,
  unstable_IdlePriority as IdlePriority,
} from 'scheduler';
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
import { IValidator } from './validate';
import { removeOnUnmount } from './utils';
import { or } from './maybe';
import { CallbackNode } from 'scheduler';

export function makeDefaultFieldProps<Value>(model: FieldModel<Value>) {
  const { value } = model;
  const taskRef = useRef<CallbackNode | null>(null);
  const props = useMemo(
    () => ({
      value,
      onChange(value: Value) {
        model.value$.next(value);
        if (model.isCompositing) {
          return;
        }
        if (!taskRef.current) {
          taskRef.current = scheduleCallback(IdlePriority, () => {
            taskRef.current = null;
            model.validate();
          });
        }
      },
      onCompositionStart() {
        model.isCompositing = true;
      },
      onCompositionEnd() {
        model.isCompositing = false;
      },
      onBlur() {
        model.validate();
      },
      onFocus() {
        model._touched = true;
      },
    }),
    [model],
  );
  useEffect(
    () => () => {
      taskRef.current && cancelCallback(taskRef.current);
    },
    [],
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
        const v = or<Value>(parent.getPatchedValue(field), defaultValue);
        model = new FieldModel<Value>(v);
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else if (isModelRef<Value, any, FieldModel<Value>>(field)) {
      const m = field.getModel();
      if (!m || isFieldModel<Value>(m)) {
        const v = or<Value>(field.patchedValue, () => or(field.initialValue, defaultValue));
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
  defaultValue: Value | (() => Value),
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
  const { value$, error$ } = model;
  useValue$(value$, value$.getValue());
  useValue$(error$, error$.getValue());
  if (typeof field === 'string' || isModelRef(field)) {
    model.validators = validators;
  }
  removeOnUnmount(field, model, parent);
  return model;
}
