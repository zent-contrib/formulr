import { useMemo } from 'react';
import { FormStrategy, FormModel, BasicModel } from './models';
import { IFormContext } from './context';
import { FormBuilder, $FieldSetBuilderChildren } from './builders';
import { BasicBuilder } from './builders/basic';

export interface IForm<T extends Record<string, BasicModel<unknown>>> {
  ctx: IFormContext;
  model: FormModel<T>;
}

export function useForm<T extends Record<string, BasicBuilder<unknown, BasicModel<unknown>>>>(
  arg: FormStrategy.View | FormBuilder<T>,
): IForm<$FieldSetBuilderChildren<T>> {
  return useMemo(() => {
    let strategy: FormStrategy;
    let model: FormModel<any>;
    if (arg === FormStrategy.View) {
      strategy = arg;
      model = new FormModel({});
    } else {
      strategy = FormStrategy.Model;
      model = arg.build();
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
