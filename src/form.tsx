import { useMemo } from 'react';
import { FormStrategy, FormModel, BasicModel } from './models';
import { IFormContext } from './context';

export interface IForm<T extends Record<string, BasicModel<unknown>>> {
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
    const ctx = {
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
