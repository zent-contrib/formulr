import { merge } from 'rxjs';
import { useMemo, useEffect } from 'react';
import { switchMap } from 'rxjs/operators';
import { useFormContext, IFormContext } from './context';
import { FieldSetModel, BasicModel, FormStrategy, ModelRef, $FieldSetValue, isModelRef } from './models';
import { useValue$ } from './hooks';
import { IValidator, validate, ErrorSubscriber, ValidatorContext, fromMaybeModelRef } from './validate';
import { removeOnUnmount, orElse, isPlainObject } from './utils';

export type IUseFieldSet<T extends Record<string, BasicModel<any>>> = [IFormContext, FieldSetModel<T>];

function useFieldSetModel<T extends Record<string, BasicModel<any>>>(
  field: string | FieldSetModel<T> | ModelRef<$FieldSetValue<T>, any, FieldSetModel<T>>,
  parent: FieldSetModel,
  strategy: FormStrategy,
) {
  return useMemo(() => {
    let model: FieldSetModel<any>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.get(field);
      if (!m || !(m instanceof FieldSetModel)) {
        model = new FieldSetModel({});
        const v = orElse(isPlainObject, parent.getPatchedValue(field), {});
        model.patchedValue = v;
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else if (isModelRef<$FieldSetValue<T>, any, FieldSetModel<T>>(field)) {
      const m = field.getModel();
      if (!m || !(m instanceof FieldSetModel)) {
        model = new FieldSetModel({});
        const v = orElse(isPlainObject, field.patchedValue, field.initialValue, {});
        model.patchedValue = v;
        field.setModel(model);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    return model;
  }, [field, parent, strategy]);
}

export function useFieldSet<T extends Record<string, BasicModel<any>>>(
  field: string | FieldSetModel<T> | ModelRef<$FieldSetValue<T>, any, FieldSetModel<T>>,
  validators: readonly IValidator<T>[] = [],
): IUseFieldSet<T> {
  const { parent, strategy, form } = useFormContext();
  const model = useFieldSetModel(field, parent, strategy);
  if (typeof field === 'string') {
    model.validators = validators;
  }
  const { validate$, error$ } = model;
  const childContext = useMemo(
    () => ({
      validate$,
      strategy,
      form,
      parent: model as FieldSetModel,
    }),
    [strategy, form, model],
  );
  /**
   * ignore returned value
   * user can get the value from model
   */
  useValue$(error$, error$.getValue());
  useEffect(() => {
    const ctx = new ValidatorContext(parent, form);
    const $ = merge(validate$, fromMaybeModelRef(field))
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [model, parent, form]);
  removeOnUnmount(field, model, parent);
  return [childContext, model];
}
