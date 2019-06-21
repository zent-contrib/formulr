import { useMemo } from 'react';
import { FormStrategy, FormModel } from './models';
import { IFormContext } from './context';

export interface IForm<T> {
  ctx: IFormContext;
  model: FormModel<T>;
}

export function useForm(arg: FormStrategy.View | (() => FormModel<any>)): IForm<any> {
  return useMemo(() => {
    let strategy: FormStrategy;
    let model: FormModel<any>;
    if (arg === FormStrategy.View) {
      strategy = arg;
      model = new FormModel({});
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
