import * as React from 'react';
import { IFieldModel, ModelType, createFieldModel, IModels } from './models';
import Context from './context';
import { Subscription, merge, never } from 'rxjs';
import {
    FormChildren,
    ensureContext,
    Validator,
    noopValidator,
    ITracedSwitchMapContext,
    makeTrace,
    IVerifyOption,
    mapValidatorResult,
    tracedSwitchMap,
} from './shared';

export interface IFieldProps<T, E = T> {
    name: string;
    defaultValue: T;
    children: FormChildren<T, E>;
    onChange?: (e: E) => T;
    onBlur?: React.FocusEventHandler;
    onFocus?: React.FocusEventHandler;
    validator: Validator<T>;
}

export interface IFieldState<T> {
    name: string;
    value: T;
    model: IFieldModel<T> | null;
    error: unknown;
    pristine: boolean;
    touched: boolean;
}

export class Field<T, E = T> extends React.Component<IFieldProps<T, E>, IFieldState<T>> {
    static defaultProps = {
        validator: noopValidator,
    };

    static contextType = Context;

    private value$$: Subscription | null = null;
    private error$$: Subscription | null = null;
    private verify$$: Subscription | null = null;
    private compositing = false;
    private trace: ITracedSwitchMapContext;

    private onCompositionStart: React.CompositionEventHandler = () => {
        this.compositing = true;
    };

    private onCompositionEnd: React.CompositionEventHandler = () => {
        this.compositing = false;
    };

    private onChange = (value: E) => {
        const { change$ } = ensureContext(this);
        const { onChange } = this.props;
        const { model } = this.state;
        if (!model) {
            return;
        }
        let nextValue: E | T = value;
        if (onChange) {
            nextValue = onChange(value);
        }
        model.value = nextValue as any;
        if (!this.compositing) {
            change$.next();
            model.verify({
                source: 'change',
            });
        }
    };

    constructor(props: IFieldProps<T, E>) {
        super(props);
        this.state = {
            name: props.name,
            value: props.defaultValue,
            model: null,
            error: null,
            pristine: true,
            touched: false,
        };
        this.trace = makeTrace(this);
    }

    getModelFromContext(): IFieldModel<T> {
        const { name, defaultValue } = this.props;
        const { controls } = ensureContext(this);
        let model = controls[name];
        if (model && model.type === ModelType.Field) {
            return model as IFieldModel<T>;
        }
        const m = createFieldModel(defaultValue);
        controls[name] = m as IModels<unknown>;
        return m;
    }

    static getDerivedStateFromProps(props: IFieldProps<unknown>, { name }: IFieldState<unknown>) {
        if (props.name !== name) {
            return {
                name: props.name,
                model: null,
            };
        }
        return null;
    }

    private attach() {
        const ctx = ensureContext(this);
        const model = this.getModelFromContext();
        this.setState({
            model,
        });
        this.value$$ = model.value$.subscribe(value => {
            this.setState({
                value,
            });
        });
        this.error$$ = model.error$.subscribe(error => {
            this.setState({
                error,
            });
        });
        this.verify$$ = merge(model.verify$, ctx.verify$)
            .pipe(tracedSwitchMap<IVerifyOption>(this.trace, this.verify))
            .subscribe(error => {
                const { model } = this.state;
                if (!model) {
                    return;
                }
                model.error = error;
            });
        model.attach = this as Field<T, unknown>;
    }

    private detach() {
        const { model } = this.state;
        this.value$$ && this.value$$.unsubscribe();
        this.error$$ && this.error$$.unsubscribe();
        this.value$$ = null;
        this.error$$ = null;
        model && (model.attach = null);
    }

    getModel = () => {
        return this.state.model;
    };

    onFocus = (e: React.FocusEvent) => {
        const { onFocus } = this.props;
        onFocus && onFocus(e);
        this.setState({
            touched: true,
        });
    };

    onBlur = (e: React.FocusEvent) => {
        const { model } = this.state;
        if (!model) {
            return;
        }
        const { onBlur } = this.props;
        onBlur && onBlur(e);
        this.setState({
            touched: true,
        });
    };

    verify = (verifyOption: IVerifyOption) => {
        const { model } = this.state;
        if (!model) {
            return never();
        }
        const { validator } = this.props;
        const ret = validator(model.value, this.context, verifyOption);
        return mapValidatorResult(ret);
    };

    componentDidMount() {
        this.attach();
    }

    componentDidUpdate() {
        const { model } = this.state;
        const ctxModel = this.getModelFromContext();
        if (!model || model !== ctxModel) {
            this.detach();
            this.attach();
        }
    }

    componentWillUnmount() {
        this.detach();
    }

    render() {
        const { value, error, model, pristine, touched } = this.state;
        const { children } = this.props;
        if (!model) {
            return null;
        }
        return children({
            value,
            error,
            pristine,
            touched,
            onCompositionStart: this.onCompositionStart,
            onCompositionEnd: this.onCompositionEnd,
            onChange: this.onChange,
            onFocus: this.onFocus,
            onBlur: this.onBlur,
        });
    }
}
