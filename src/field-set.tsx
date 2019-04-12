import { useFormContext, IFormContext } from './context';
import { FieldSetModel, IErrors, BasicModel, FormStrategy } from './models';
import { useMemo } from 'react';
import { useValue$ } from './hooks';
import { IValidator } from './validate';

export interface IFieldSetMeta<T> {
  error: IErrors<T>;
}

export function useFieldSet<T>(
  field: string | FieldSetModel<T>,
  validators?: ReadonlyArray<IValidator<T>>,
): [IFormContext, IFieldSetMeta<T>, FieldSetModel<T>] {
  const ctx = useFormContext();
  let model: FieldSetModel<T>;
  if (typeof field === 'string') {
    if (ctx.strategy !== FormStrategy.View) {
      throw new Error();
    }
    const m = ctx.parent.children[field];
    if (!m || !(m instanceof FieldSetModel)) {
      model = new FieldSetModel();
      ctx.parent.children[field] = model as BasicModel<unknown>;
    } else {
      model = m;
    }
    model.validators = validators || [];
  } else {
    model = field;
  }
  const { validate$, change$, error$ } = model;
  const { strategy, form } = ctx;
  const childContext = useMemo(
    () => ({
      validate$,
      change$,
      strategy,
      form,
      parent: model as FieldSetModel,
    }),
    [validate$, change$, strategy, form, model],
  );
  const error = useValue$(error$, error$.getValue());
  return [
    childContext,
    {
      error,
    },
    model,
  ];
}
