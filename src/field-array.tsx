import * as React from 'react';
import { never, Subscription, Subject, merge } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import {
  ErrorType,
  Validator,
  IVerifyOption,
  ensureContext,
  mapValidatorResult,
  noopValidator,
  ITracedSwitchMapContext,
  makeTrace,
  tracedSwitchMap,
} from './shared';
import { IFieldArrayModel, touchFieldArray } from './models';
import FormContext from './context';

export interface IFieldArrayChildProps {
  keys: string[];
  onKeysChange(keys: string[]): void;
  error: ErrorType;
}

export interface IFieldArrayProps<T> {
  name: string;
  validator: Validator<T[]>;
  children(props: IFieldArrayChildProps): React.ReactNode;
}

export interface IFieldArrayState<T> {
  name: string;
  model: IFieldArrayModel<T> | null;
  keys: string[];
  error: ErrorType;
}

export class FieldArray<T> extends React.Component<IFieldArrayProps<T>, IFieldArrayState<T>> {
  static defaultProps = {
    validator: noopValidator,
  };

  static contextType = FormContext;

  private change$ = new Subject<never>();
  private $keys: Subscription | null = null;
  private $error: Subscription | null = null;
  private $verify: Subscription | null = null;
  private trace: ITracedSwitchMapContext;

  constructor(props: IFieldArrayProps<T>) {
    super(props);
    this.state = {
      name: props.name,
      model: null,
      keys: [],
      error: null,
    };
    this.trace = makeTrace(this);
  }

  setValue = (value: T[]) => {
    const { model } = this.state;
    if (!model) {
      return;
    }
    model.setValues(value);
  }

  getModel() {
    return this.state.model;
  }

  verify = (verifyOption: IVerifyOption) => {
    const { model } = this.state;
    if (!model) {
      return never();
    }
    const { validator } = this.props;
    const ret = validator(model.getRawValue(), verifyOption);
    return mapValidatorResult(ret);
  };

  onKeysChange = (keys: string[]) => {
    const { model } = this.state;
    if (model) {
      model.keys = keys;
    }
  };

  attach() {
    const ctx = ensureContext(this);
    const { name } = this.props;
    const model = touchFieldArray<T>(name, ctx);
    this.setState({
      model,
    });
    this.$keys = model.keys$.subscribe(keys => {
      this.setState({
        keys,
      });
    });
    this.$error = model.error$.subscribe(error => {
      this.setState({
        error,
      });
    });
    this.$verify = merge(
      this.change$.pipe(
        mapTo({
          source: 'change',
        }),
      ),
      ctx.verify$,
    )
      .pipe(tracedSwitchMap(this.trace, this.verify))
      .subscribe(error => {
        model.error = error;
      });
    model.attach = this;
  }

  detach() {
    const { model } = this.state;
    if (!model) {
      return;
    }
    this.$keys && this.$keys.unsubscribe();
    this.$error && this.$error.unsubscribe();
    this.$verify && this.$verify.unsubscribe();
    this.$keys = null;
    this.$error = null;
    this.$verify = null;
    model.attach = null;
  }

  static getDerivedStateFromProps(props: IFieldArrayProps<unknown>, { name }: IFieldArrayState<unknown>) {
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
    const ctxModel = touchFieldArray<T>(name, ctx);
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
    const { model, keys, error } = this.state;
    if (!model) {
      return null;
    }
    const { children, name } = this.props;
    return (
      <FormContext.Provider
        value={{
          ...ctx,
          section: model as IFieldArrayModel<unknown>,
          controls: model.controls,
          change$: this.change$,
          getShadowValue() {
            return model.shadowValue || ctx.getShadowValue()[name] || {};
          },
        }}
      >
        {children({
          keys,
          error,
          onKeysChange: this.onKeysChange,
        })}
      </FormContext.Provider>
    );
  }
}
