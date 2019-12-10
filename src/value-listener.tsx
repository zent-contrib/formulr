import * as React from 'react';
import { merge, never, of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { useFormContext, FormContext, IFormContext } from './context';
import { useValue$ } from './hooks';
import {
  FieldModel,
  FieldArrayModel,
  BasicModel,
  isFieldSetModel,
  isFieldModel,
  isFieldArrayModel,
  isModelRef,
  ModelRef,
} from './models';
import { noop } from './utils';

export interface IFieldSetValueProps {
  name: string;
  children?: React.ReactNode;
}

function getModelFromContext<Model>(
  ctx: IFormContext,
  name: string | undefined,
  model: Model | undefined,
  check: (m: any) => m is Model,
): Model | null {
  const { parent } = ctx;
  const m = React.useMemo(() => {
    if (typeof name === 'string') {
      const m = parent.get(name);
      if (check(m)) {
        return m;
      }
    }
    if (check(model)) {
      return model;
    }
    return null;
  }, [ctx, name, model, check, parent]);
  const [maybeModel, setModel] = React.useState(m);
  React.useEffect(() => {
    if (!name) {
      return noop;
    }
    const m = parent.get(name);
    check(m) && setModel(m);
    const $ = merge(parent.childRegister$, parent.childRemove$)
      .pipe(filter(change => change === name))
      .subscribe(name => {
        const candidate = parent.get(name);
        if (check(candidate)) {
          setModel(candidate);
        }
      });
    return () => $.unsubscribe();
  }, [name, parent, m]);
  return maybeModel;
}

/**
 * 根据 `name` 订阅 `FieldSet` 的值
 */
export function FieldSetValue({ name, children }: IFieldSetValueProps) {
  const ctx = useFormContext();
  const model = getModelFromContext(ctx, name, undefined, isFieldSetModel);
  const childContext = React.useMemo<IFormContext>(
    () => ({
      ...ctx,
      parent: model!,
    }),
    [ctx, model],
  );
  if (model) {
    return (
      <FormContext.Provider key={model.id} value={childContext}>
        {children}
      </FormContext.Provider>
    );
  }
  return null;
}

export interface IFieldValueCommonProps<T> {
  /**
   * render props，参数是 Field 当前的值
   */
  children?: (value: T | null) => React.ReactElement | null;
}

export interface IFieldValueViewDrivenProps<T> extends IFieldValueCommonProps<T> {
  name: string;
}

export interface IFieldValueModelDrivenProps<T> extends IFieldValueCommonProps<T> {
  model: FieldModel<T>;
}

export type IFieldValueProps<T> = IFieldValueModelDrivenProps<T> | IFieldValueViewDrivenProps<T>;

/**
 * 根据 `name` 或者 `model` 订阅字段的更新
 */
export function FieldValue<T>(props: IFieldValueProps<T>): React.ReactElement | null {
  const { name, model: maybeModel, children } = props as Partial<
    IFieldValueModelDrivenProps<T> & IFieldValueViewDrivenProps<T>
  >;
  const ctx = useFormContext();
  const [model, setModel] = React.useState<FieldModel<T> | ModelRef<T, any, FieldModel<T>> | null>(
    isFieldModel(maybeModel) || isModelRef(maybeModel) ? maybeModel : null,
  );
  React.useEffect(() => {
    if (!name) {
      setModel(isFieldModel(maybeModel) || isModelRef(maybeModel) ? maybeModel : null);
      return noop;
    }
    const m = ctx.parent.get(name);
    if (isFieldModel<T>(m)) {
      setModel(m);
    }
    const $ = merge(ctx.parent.childRegister$, ctx.parent.childRemove$)
      .pipe(filter(change => change === name))
      .subscribe(name => {
        const candidate = ctx.parent.get(name);
        if (isFieldModel<T>(candidate)) {
          setModel(candidate);
        }
      });
    return () => $.unsubscribe();
  }, [name, parent, maybeModel]);
  if (!model) {
    useValue$(never(), null);
    return null;
  } else if (isModelRef<T, any, FieldModel<T>>(model)) {
    const [value, setValue] = React.useState();
    React.useEffect(() => {
      const $ = model.model$
        .pipe(
          switchMap(it => {
            if (isFieldModel(it)) {
              return it.value$;
            }
            return of(null);
          }),
        )
        .subscribe(value => setValue(value));
      return () => $.unsubscribe();
    }, [model]);
    if (children) {
      return children(value);
    }
    return (value as unknown) as React.ReactElement;
  }
  const value = useValue$(model.value$, model.value);
  if (children) {
    return children(value);
  }
  return (value as unknown) as React.ReactElement;
}

/**
 * 根据 `name` 或者 `model` 订阅 `FieldArray` 的更新
 */
export function useFieldArrayValue<Item, Child extends BasicModel<Item>>(field: string | FieldArrayModel<Item, Child>) {
  const ctx = useFormContext();
  const model = getModelFromContext(
    ctx,
    field as string | undefined,
    field as FieldArrayModel<Item, Child> | undefined,
    isFieldArrayModel,
  );
  if (!model) {
    useValue$(never(), null);
    return null;
  }
  const children = useValue$(model.children$, model.children);
  return children;
}
