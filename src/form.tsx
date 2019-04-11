import { useCallback, useMemo } from 'react';
import { FormStrategy, FormModel } from './models';
import { ValidateStrategy } from './validate';
import { useValue$ } from './utils';
import { IFormContext } from './context';

export interface IFormApis {
  validate(strategy: ValidateStrategy): void;
  isValidating: boolean;
}

export function useForm(strategy: FormStrategy.View): void;

export function useForm(model: FormModel): void;

export function useForm(
  a: FormStrategy.View | FormModel,
): [IFormApis, IFormContext] {
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
  const isValidating = useValue$(model.isValidating$, false);
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
      isValidating,
    },
    ctx,
  ];
}
