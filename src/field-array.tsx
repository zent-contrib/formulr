import { merge } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { useEffect, useMemo } from 'react';
import {
  FieldArrayModel,
  BasicModel,
  FormStrategy,
  FieldSetModel,
  FieldArrayChild,
  ModelRef,
  isModelRef,
} from './models';
import { useFormContext } from './context';
import { useValue$ } from './hooks';
import { IValidator, validate, ErrorSubscriber, ValidatorContext, fromMaybeModelRef } from './validate';
import { removeOnUnmount, orElse } from './utils';

export type IUseFieldArray<Item, Child extends BasicModel<Item>> = [
  FieldArrayChild<Item, Child>[],
  FieldArrayModel<Item, Child>,
];

function useArrayModel<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item, Child> | ModelRef<readonly (Item | null)[], any, FieldArrayModel<Item, Child>>,
  parent: FieldSetModel,
  strategy: FormStrategy,
  defaultValue: readonly (Item | Child)[],
) {
  return useMemo(() => {
    let model: FieldArrayModel<Item, Child>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.get(field);
      if (!m || !(m instanceof FieldArrayModel)) {
        const v = orElse(Array.isArray, parent.getPatchedValue(field), defaultValue);
        model = new FieldArrayModel<Item, Child>(null, v);
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else if (isModelRef<readonly (Item | null)[], any, FieldArrayModel<Item, Child>>(field)) {
      const m = field.getModel();
      if (!m || !(m instanceof FieldArrayModel)) {
        const v = orElse(Array.isArray, field.patchedValue, field.initialValue, []);
        model = new FieldArrayModel(null, v);
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

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string | ModelRef<readonly (Item | null)[], any, FieldArrayModel<Item, Child>>,
  validators?: readonly IValidator<readonly (Item | null)[]>[],
  defaultValue?: Item[],
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: FieldArrayModel<Item, Child>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item, Child> | ModelRef<readonly (Item | null)[], any, FieldArrayModel<Item, Child>>,
  validators: readonly IValidator<readonly (Item | null)[]>[] = [],
  defaultValue: readonly Item[] = [],
): IUseFieldArray<Item, Child> {
  const { parent, strategy, form } = useFormContext();
  const model = useArrayModel(field, parent, strategy, defaultValue);
  if (typeof field === 'string') {
    model.validators = validators;
  }
  const { error$, validate$, children$ } = model;
  /**
   * ignore returned value
   * user can get the value from model
   */
  useValue$(children$, children$.getValue());
  useValue$(error$, error$.getValue());
  useEffect(() => {
    const ctx = new ValidatorContext(parent, form);
    const $ = merge(validate$, fromMaybeModelRef(field))
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [model, parent]);
  removeOnUnmount(field, model, parent);
  return [model.children$.getValue(), model];
}
