import * as React from 'react';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { merge, empty } from 'rxjs';
import { useFormContext, FormContext, IFormContext } from './context';
import { useValue$ } from './hooks';
import { FieldModel, FieldSetModel, FieldArrayModel, BasicModel } from './models';

export interface IFieldSetValueProps {
  name: string;
  children?: ReactNode;
}

function subscribeParent(parent: FieldSetModel<any>, model: BasicModel<any> | null | undefined, name: unknown) {
  const [, setModel] = useState(model);
  const $ = useMemo(() => {
    if (typeof name !== 'string') {
      return null;
    }
    return merge(parent.childRegister$, parent.childRemove$).subscribe(changedName => {
      if (changedName === name) {
        setModel(parent.get(name));
      }
    });
  }, [name]);
  useEffect(() => ($ !== null ? $.unsubscribe.bind($) : () => {}), [parent, $]);
}

export function FieldSetValue({ name, children }: IFieldSetValueProps) {
  const { parent, strategy, form } = useFormContext();
  const model = parent.get(name) as FieldSetModel<any>;
  subscribeParent(parent, model, name);
  const childContext = useMemo<IFormContext>(
    () => ({
      validate$: empty(),
      strategy,
      form,
      parent: model as FieldSetModel,
    }),
    [strategy, form, model],
  );
  if (model instanceof FieldSetModel) {
    return <FormContext.Provider value={childContext}>{children}</FormContext.Provider>;
  }
  return null;
}

export interface IFieldValueCommonProps<T> {
  children?: (value: T | null) => React.ReactElement | null;
}

export interface IFieldValueModelDrivenProps<T> extends IFieldValueCommonProps<T> {
  name: string;
}

export interface IFieldValueViewDrivenProps<T> extends IFieldValueCommonProps<T> {
  model: FieldModel<T>;
}

export type IFieldValueProps<T> = IFieldValueModelDrivenProps<T> | IFieldValueViewDrivenProps<T>;

export function FieldValue<T extends React.ReactElement | null>(props: IFieldValueProps<T>): React.ReactElement | null {
  const { name, model, children } = props as Partial<IFieldValueModelDrivenProps<T> & IFieldValueViewDrivenProps<T>>;
  let field: FieldModel<T> | null | undefined = null;
  const { parent } = useFormContext();
  if (model) {
    field = model;
  } else if (name) {
    const m = parent.get(name) as FieldModel<T>;
    if (m instanceof FieldModel) {
      field = m;
    }
  }
  subscribeParent(parent, field, name);
  const value = useValue$(field ? field.value$ : empty(), field ? field.value : null);
  if (children) {
    return children(value);
  }
  return value;
}

export function useFieldArrayValue<Item, Child extends BasicModel<Item>>(field: string | FieldArrayModel<Item, Child>) {
  const { parent } = useFormContext();
  let model: FieldArrayModel<Item, Child> | null | undefined = null;
  if (typeof field === 'string') {
    let m = parent.get(field);
    if (m instanceof FieldArrayModel) {
      model = m;
    }
  } else if (field instanceof FieldArrayModel) {
    model = field;
  }
  subscribeParent(parent, model, field);
  if (!model) {
    return null;
  }
  return model.children;
}
