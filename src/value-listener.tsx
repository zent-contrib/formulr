import * as React from 'react';
import { merge, never } from 'rxjs';
import { filter } from 'rxjs/operators';
import { useFormContext, FormContext, IFormContext } from './context';
import { useValue$ } from './hooks';
import { FieldModel, FieldArrayModel, BasicModel, isFieldSetModel, isFieldModel, isFieldArrayModel } from './models';
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

export interface IFieldValueModelDrivenProps<T> extends IFieldValueCommonProps<T> {
  name: string;
}

export interface IFieldValueViewDrivenProps<T> extends IFieldValueCommonProps<T> {
  model: FieldModel<T>;
}

export type IFieldValueProps<T> = IFieldValueModelDrivenProps<T> | IFieldValueViewDrivenProps<T>;

/**
 * 根据 `name` 或者 `model` 订阅字段的更新
 */
export function FieldValue<T extends React.ReactElement | null>(props: IFieldValueProps<T>): React.ReactElement | null {
  const { name, model: maybeModel, children } = props as Partial<
    IFieldValueModelDrivenProps<T> & IFieldValueViewDrivenProps<T>
  >;
  const ctx = useFormContext();
  const model = getModelFromContext(ctx, name, maybeModel, isFieldModel);
  if (model) {
    const value = useValue$(model.value$, model.value);
    if (children) {
      return children(value);
    }
    return <>{value}</>;
  }
  useValue$(never(), null);
  return null;
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
