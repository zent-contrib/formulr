import * as React from 'react';
import { IFormModel, createFormModel } from './models';
import { IValidationState } from './shared';
import { Subscription } from 'rxjs';
import FormContext from './context';

export class Form<T = any> extends React.Component {
  private readonly model: IFormModel<T>;
  private readonly validationState: IValidationState;
  private $change: Subscription | null = null;

  isDirty = false;

  constructor(props: {}) {
    super(props);
    this.model = createFormModel();
    this.validationState = {
      validating: new Set(),
    };
  }

  getValue = () => {
    this.model.getRawValue();
  };

  setValue = (values: T) => {
    this.model.setValues(values);
  };

  componentDidMount() {
    this.$change = this.model.change$.subscribe(() => {
      this.isDirty = true;
    });
  }

  componentWillUnmount() {
    this.$change && this.$change.unsubscribe();
    this.$change = null;
  }

  render() {
    const { children } = this.props;
    const { change$, verify$, controls } = this.model;

    return (
      <FormContext.Provider
        value={{
          change$,
          verify$,
          controls,
          form: this.model,
          section: this.model,
          validationState: this.validationState,
          getShadowValue: () => {
            return this.model.shadowValue || {};
          },
        }}
      >
        {children}
      </FormContext.Provider>
    );
  }
}
