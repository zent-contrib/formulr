import { createContext, useContext } from 'react';
import { Subject } from 'rxjs';
import { FormStrategy, FormModel, FieldSetModel } from './models';
import { ValidateStrategy } from './validate';

export interface IFormContext {
  validate$: Subject<ValidateStrategy>;
  strategy: FormStrategy;
  form: FormModel;
  parent: FieldSetModel;
}

export const FormContext = createContext<IFormContext | null>(null);

FormContext.displayName = 'FormContext';

export const FormProvider = FormContext.Provider;

export function useFormContext(): IFormContext {
  const ctx = useContext(FormContext);
  if (ctx === null) {
    throw new Error();
  }
  return ctx;
}

export default FormContext;
