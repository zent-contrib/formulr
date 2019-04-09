import { createContext } from 'react';
import { Subject } from 'rxjs';
// import { IFieldSetModel, IControls, IFieldArrayModel, IFormModel } from './models';
import { IVerifyOption } from './shared';
import { Model, FormStrategy } from './models';

export interface IFormContext {
  verify$: Subject<IVerifyOption>;
  change$: Subject<never>;
  getShadowValue(): any;
  strategy: FormStrategy;
  // validationState: IValidationState;
  fields: {
    [key: string]: Model<any>;
  }
}

export const FormContext = createContext<IFormContext>({
  fields: {},
  getShadowValue() {
    return {};
  },
  verify$: new Subject(),
  change$: new Subject(),
  strategy: FormStrategy.Model,
  // validationState:
});

FormContext.displayName = 'FormContext';

export const FormProvider = FormContext.Provider;

export default FormContext;
