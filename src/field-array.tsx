import { merge } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { useEffect, useMemo } from 'react';
import { FieldArrayModel, BasicModel, IFieldArrayChildFactory, FormStrategy, FieldSetModel } from './models';
import { useFormContext } from './context';
import { useValue$ } from './hooks';
import { IValidator, validate, ErrorSubscriber, ValidatorContext } from './validate';

export type IUseFieldArray<Item, Child extends BasicModel<Item>> = [Array<Child>, FieldArrayModel<Item>];

function useArrayModel<Item>(
  field: string | FieldArrayModel<Item>,
  parent: FieldSetModel,
  strategy: FormStrategy,
  factory: IFieldArrayChildFactory<Item>,
) {
  return useMemo(() => {
    let model: FieldArrayModel<Item>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.children[field];
      if (!m || !(m instanceof FieldArrayModel)) {
        model = new FieldArrayModel(factory as IFieldArrayChildFactory<Item>);
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
  factory: IFieldArrayChildFactory<Item>,
  validators?: ReadonlyArray<IValidator<ReadonlyArray<Item>>>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: FieldArrayModel<Item>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item>,
  factory?: IFieldArrayChildFactory<Item>,
  validators: ReadonlyArray<IValidator<ReadonlyArray<Item>>> = [],
): IUseFieldArray<Item, Child> {
  const { parent, strategy, validate$: parentValidate$, form } = useFormContext();
  const model = useArrayModel(field, parent, strategy, factory as IFieldArrayChildFactory<Item>);
  if (typeof field === 'string') {
    model.validators = validators;
  }
  const { error$, validateSelf$ } = model;
  /**
   * ignore returned value
   * user can get the value from model
   */
  useValue$(error$, error$.getValue());
  useEffect(() => {
    const ctx = new ValidatorContext(parent, form);
    const $ = merge(parentValidate$, validateSelf$)
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [model, parent]);
  useEffect(() => {
    model.attached = true;
    return () => {
      model.attached = false;
    };
  }, [model]);
  return [model.models$.getValue() as Array<Child>, model];
}
