import { useFormContext, IFormContext } from './context';
import { FieldSetModel, IErrors, BasicModel, FormStrategy } from './models';
import { useMemo, useEffect } from 'react';
import { useValue$ } from './hooks';
import { IValidator } from './validate';

export interface IFieldSetMeta<T> {
  error: IErrors<T>;
}

export function useFieldSet<T>(
  field: string | FieldSetModel<T>,
  validators?: ReadonlyArray<IValidator<T>>,
): [IFormContext, IFieldSetMeta<T>, FieldSetModel<T>] {
  const { parent, strategy, form } = useFormContext();
  let model: FieldSetModel<T>;
  if (typeof field === 'string') {
    if (strategy !== FormStrategy.View) {
      throw new Error();
    }
    const m = parent.children[field];
    if (!m || !(m instanceof FieldSetModel)) {
      model = new FieldSetModel();
      parent.children[field] = model as BasicModel<unknown>;
    } else {
      model = m;
    }
    model.validators = validators || [];
  } else {
    model = field;
  }
  const { validate$, error$ } = model;
  const childContext = useMemo(
    () => ({
      validate$,
      strategy,
      form,
      parent: model as FieldSetModel,
    }),
    [validate$, strategy, form, model],
  );
  const error = useValue$(error$, error$.getValue());
  useEffect(() => {
    const $ = validate$.subscribe(parent.validate$);
    return $.unsubscribe.bind($);
  }, [model, parent]);
  return [
    childContext,
    {
      error,
    },
    model,
  ];
}
