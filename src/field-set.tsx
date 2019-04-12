import { useFormContext, IFormContext } from './context';
import { FieldSetModel, IErrors, BasicModel } from './models';
import { useMemo } from 'react';
import { useValue$ } from './utils';

export interface IFieldSetMeta<T> {
  error: IErrors<T>;
}

export function useFieldSet<T>(
  field: string | FieldSetModel<T>,
): [IFormContext, IFieldSetMeta<T>, FieldSetModel<T>] {
  const ctx = useFormContext();
  let model: FieldSetModel<T>;
  if (typeof field === 'string') {
    const m = ctx.parent.children[field];
    if (!m || !(m instanceof FieldSetModel)) {
      model = new FieldSetModel();
      ctx.parent.children[field] = model as BasicModel<unknown>;
    } else {
      model = m;
    }
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
