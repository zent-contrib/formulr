import { useMemo } from 'react';
import { FormStrategy, FormModel } from './models';
import { IFormContext } from './context';

export interface IForm {
  ctx: IFormContext;
  model: FormModel;
}

export function useForm<T extends object = any>(arg: FormStrategy.View | (() => FormModel<T>)): IForm {
  return useMemo(() => {
    let strategy: FormStrategy;
    let model: FormModel;
    if (arg === FormStrategy.View) {
      strategy = arg;
      model = new FormModel();
    } else if (typeof arg === 'function') {
      strategy = FormStrategy.Model;
      model = arg();
    } else {
      throw new Error('invalid argument for useForm');
    }
    const { validateChildren$ } = model;
    const ctx = {
      validate$: validateChildren$,
      strategy,
      form: model,
      parent: model,
    };
    return {
      ctx,
      model,
    };
  }, [arg]);
}
