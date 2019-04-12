import { useCallback, useMemo } from 'react';
import { FormStrategy, FormModel } from './models';
import { ValidateStrategy } from './validate';
import { IFormContext } from './context';

export interface IFormApis {
  validate(strategy: ValidateStrategy): void;
}

export function useForm(strategy: FormStrategy.View): void;

export function useForm(model: FormModel): void;

export function useForm(
  a: FormStrategy.View | FormModel,
): [IFormApis, IFormContext, FormModel] {
  let strategy: FormStrategy;
  let model: FormModel;
  if (a === FormStrategy.View) {
    strategy = a;
    model = new FormModel();
  } else {
    strategy = FormStrategy.Model;
    model = a;
  }
  const { validate$, change$ } = model;
  const validate = useCallback(
    (strategy = ValidateStrategy.Normal) => {
      model.validate(strategy);
    },
    [model],
  );
  const ctx = useMemo<IFormContext>(
    () => ({
      validate$,
      change$,
      strategy,
      form: model,
      parent: model,
    }),
    [validate$, change$, strategy, model],
  );
  return [
    {
      validate,
    },
    ctx,
    model,
  ];
}
