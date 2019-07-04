import { merge } from 'rxjs';
import { useMemo, useEffect } from 'react';
import { switchMap } from 'rxjs/operators';
import { useFormContext, IFormContext } from './context';
import { FieldSetModel, BasicModel, FormStrategy } from './models';
import { useValue$ } from './hooks';
import { IValidator, validate, ErrorSubscriber, ValidatorContext } from './validate';
import { getValueFromParentOrDefault, removeOnUnmount } from './utils';

export type IUseFieldSet<T> = [IFormContext, FieldSetModel<T>];

function useFieldSetModel<T extends object>(
  field: string | FieldSetModel<T>,
  parent: FieldSetModel,
  strategy: FormStrategy,
) {
  return useMemo(() => {
    let model: FieldSetModel<any>;
    if (typeof field === 'string') {
      if (strategy !== FormStrategy.View) {
        throw new Error();
      }
      const m = parent.children[field];
      if (!m || !(m instanceof FieldSetModel)) {
        model = new FieldSetModel({});
        const v = getValueFromParentOrDefault<T>(parent, field, {} as T);
        model.patchedValue = v;
        parent.registerChild(field, model as BasicModel<unknown>);
      } else {
        model = m;
      }
    } else {
      model = field;
    }
    return model;
  }, [field, parent, strategy]);
}

export function useFieldSet<T extends object>(
  field: string | FieldSetModel<T>,
  validators: Array<IValidator<T>> = [],
): IUseFieldSet<T> {
  const { parent, strategy, form, validate$: parentValidate$ } = useFormContext();
  const model = useFieldSetModel(field, parent, strategy);
  if (typeof field === 'string') {
    model.validators = validators;
  }
  const { validateSelf$, error$ } = model;
  const childContext = useMemo(
    () => ({
      validate$: model.validateChildren$,
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
    const $ = merge(parentValidate$, validateSelf$)
      .pipe(switchMap(validate(model, ctx)))
      .subscribe(new ErrorSubscriber(model));
    return $.unsubscribe.bind($);
  }, [model, parent, form]);
  removeOnUnmount(field, model, parent);
  return [childContext, model];
}
