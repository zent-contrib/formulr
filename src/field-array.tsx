import { merge } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { useEffect, useMemo } from 'react';
import { FieldArrayModel, BasicModel, FormStrategy, FieldSetModel } from './models';
import { useFormContext } from './context';
import { useValue$ } from './hooks';
import { IValidator, validate, ErrorSubscriber, ValidatorContext } from './validate';
import { getValueFromParentOrDefault, removeOnUnmount } from './utils';

export type IUseFieldArray<Item, Child extends BasicModel<Item>> = [Child[], FieldArrayModel<Item, Child>];

function useArrayModel<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item, Child>,
  parent: FieldSetModel,
  strategy: FormStrategy,
  factory: (item: Item) => Child,
) {
  return useMemo(() => {
    let model: FieldArrayModel<Item, Child>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.children[field];
      if (!m || !(m instanceof FieldArrayModel)) {
        model = new FieldArrayModel(factory);
        const v = getValueFromParentOrDefault(parent, field, []);
        if (Array.isArray(v)) {
          model.initialize(v);
        }
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    return model;
  }, [field, parent, strategy, factory]);
}

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string,
  factory: (item: Item) => Child,
  validators?: Array<IValidator<Array<Item>>>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: FieldArrayModel<Item, Child>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item, Child>,
  factory?: (item: Item) => Child,
  validators: Array<IValidator<Array<Item>>> = [],
): IUseFieldArray<Item, Child> {
  const { parent, strategy, validate$: parentValidate$, form } = useFormContext();
  const model = useArrayModel(field, parent, strategy, factory as (item: Item) => Child);
  if (typeof field === 'string') {
    model.validators = validators;
  }
  const { error$, validateSelf$, children$ } = model;
  /**
   * ignore returned value
   * user can get the value from model
   */
  useValue$(children$, children$.getValue());
  useValue$(error$, error$.getValue());
  useEffect(() => {
    const ctx = new ValidatorContext(parent, form);
    const $ = merge(parentValidate$, validateSelf$)
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [model, parent]);
  removeOnUnmount(field, model, parent);
  return [model.children$.getValue(), model];
}
