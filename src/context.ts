import { createContext } from 'react';
import { Subject } from 'rxjs';
import { IFieldSetModel, IControls, IFieldArrayModel, IFormModel } from './models';
import { IVerifyOption, IValidationState } from './shared';

export interface IFormContext {
  form: IFormModel<unknown>;
  controls: IControls;
  section: IFieldSetModel<unknown> | IFieldArrayModel<unknown> | IFormModel<unknown>;
  verify$: Subject<IVerifyOption>;
  change$: Subject<never>;
  getShadowValue(): any;
  validationState: IValidationState;
}

export const FormContext = createContext<IFormContext | null>(null);

FormContext.displayName = 'FormContext';

export const FormProvider = FormContext.Provider;

export default FormContext;
