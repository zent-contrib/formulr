import { createContext, useContext } from 'react';
import { FormStrategy, FormModel, FieldSetModel } from './models';
import { isNil } from './utils';

export interface IFormContext {
  strategy: FormStrategy;
  form: FormModel<any>;
  parent: FieldSetModel;
}

export const FormContext = createContext<IFormContext | null>(null);

FormContext.displayName = 'FormContext';

export const FormProvider = FormContext.Provider;

export function useFormContext(): IFormContext {
  const ctx = useContext(FormContext);
  if (ctx === null) {
    throw new Error('Cannot find FormContext.\nUse field component within Form.');
  }
  return ctx;
}

export default FormContext;

export const ValueContext = createContext<IFormContext | null>(null);

export function useValueContext(): IFormContext {
  const formCtx = useContext(FormContext);
  const valueCtx = useContext(ValueContext);
  if (isNil(formCtx) && isNil(valueCtx)) {
    throw new Error('Cannot find ValueContext.\n Use value component within Form');
  }
  return (valueCtx || formCtx) as IFormContext;
}
