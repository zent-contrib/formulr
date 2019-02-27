import * as React from 'react';
import { Subject, Subscription, merge, never } from 'rxjs';
import {
  ErrorType,
  Validator,
  noopValidator,
  ensureContext,
  ITracedSwitchMapContext,
  makeTrace,
  IVerifyOption,
  mapValidatorResult,
  tracedSwitchMap,
} from './shared';
import FormContext from './context';
import { IFieldSetModel, touchFieldSet } from './models';

export interface IFieldSetChildProps {
  error: ErrorType;
}

export interface IFieldSetProps<T> {
  name: string;
  validator: Validator<T>;
  children: (props: IFieldSetChildProps) => React.ReactNode;
}

export interface IFieldSetState<T> {
  name: string;
  model: IFieldSetModel<T> | null;
  error: ErrorType;
}

export class FieldSet<T = unknown> extends React.Component<IFieldSetProps<T>, IFieldSetState<T>> {
  static defaultProps = {
    validator: noopValidator,
  };

  static contextType = FormContext;

  private $error: Subscription | null = null;
  private $change: Subscription | null = null;
  private $changeToVerify: Subscription | null = null;
  private $verify: Subscription | null = null;
  private readonly change$ = new Subject<never>();
  private readonly trace: ITracedSwitchMapContext;
  // private readonly e

  constructor(props: IFieldSetProps<T>) {
    super(props);
    this.state = {
      name: props.name,
      model: null,
      error: null,
    };
    this.trace = makeTrace(this);
  }

  getModel = () => {
    return this.state.model;
  };

  verify = (verifyOption: IVerifyOption) => {
    const { model } = this.state;
    if (!model) {
      return never();
    }
    const { validator } = this.props;
    const ret = validator(model.getRawValues(), verifyOption);
    return mapValidatorResult(ret);
  };

  attach() {
    // const { defaultValue } = this.props;
    const { name } = this.state;
    const ctx = ensureContext(this);
    const model = touchFieldSet<T>(name, ctx);
    this.setState({
      model,
    });
    this.$error = model.error$.subscribe(error => {
      this.setState({
        error,
      });
    });
    this.$change = this.change$.subscribe(ctx.change$);
    this.$changeToVerify = this.change$.subscribe(() => {
      model.verify({
        source: 'change',
      });
    });
    this.$verify = merge(model.verify$, ctx.verify$)
      .pipe(tracedSwitchMap<IVerifyOption>(this.trace, this.verify))
      .subscribe(error => {
        model.error = error;
      });
    model.attach = this as FieldSet<unknown>;
  }

  detach() {
    const { model } = this.state;
    this.$change && this.$change.unsubscribe();
    this.$changeToVerify && this.$changeToVerify.unsubscribe();
    this.$error && this.$error.unsubscribe();
    this.$verify && this.$verify.unsubscribe();
    this.$change = null;
    this.$changeToVerify = null;
    this.$error = null;
    this.$verify = null;
    model && (model.attach = null);
  }

  static getDerivedStateFromProps(props: IFieldSetProps<unknown>, { name }: IFieldSetState<unknown>) {
    if (props.name !== name) {
      return {
        name: props.name,
        model: null,
        error: null,
      };
    }
    return null;
  }

  componentDidMount() {
    this.attach();
  }

  componentDidUpdate() {
    const ctx = ensureContext(this);
    const { model, name } = this.state;
    const ctxModel = touchFieldSet(name, ctx);
    if (!model || model !== ctxModel) {
      this.detach();
      this.attach();
    }
  }

  componentWillUnmount() {
    this.detach();
  }

  render() {
    const ctx = ensureContext(this);
    const { model, error } = this.state;
    if (!model) {
      return null;
    }
    const { children, name } = this.props;
    return (
      <FormContext.Provider
        value={{
          ...ctx,
          section: model,
          controls: model.controls,
          change$: this.change$,
          getShadowValue() {
            return model.shadowValue || ctx.getShadowValue()[name] || {};
          },
        }}
      >
        {children({
          error,
        })}
      </FormContext.Provider>
    );
  }
}
