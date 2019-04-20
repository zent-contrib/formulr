import { useMemo } from 'react';
import { FormStrategy, FormModel } from './models';
import { ValidateStrategy } from './validate';
import { IFormContext } from './context';

export interface IForm {
  validate(strategy: ValidateStrategy): void;
  ctx: IFormContext;
  model: FormModel;
}

export function useForm(strategy: FormStrategy.View): void;

export function useForm(model: FormModel): void;

export function useForm(arg: FormStrategy.View | FormModel): IForm {
  return useMemo(() => {
    let strategy: FormStrategy;
    let model: FormModel;
    if (arg === FormStrategy.View) {
      strategy = arg;
      model = new FormModel();
    } else {
      strategy = FormStrategy.Model;
      model = arg;
    }
    const { validate$ } = model;
    function validate(strategy = ValidateStrategy.Normal) {
      model.validate(strategy);
    }
    const ctx = {
      validate$,
      strategy,
      form: model,
      parent: model,
    };
    return {
      validate,
      ctx,
      model,
    };
  }, [arg]);
}
