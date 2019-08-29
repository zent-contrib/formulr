import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { merge, empty } from 'rxjs';
import { useFormContext, FormContext, IFormContext } from './context';
import { useValue$ } from './hooks';
import {
  FieldModel,
  FieldSetModel,
  FieldArrayModel,
  BasicModel,
  isFieldSetModel,
  isFieldModel,
  isFieldArrayModel,
} from './models';
import { noop } from './utils';

export interface IFieldSetValueProps {
  name: string;
  children?: React.ReactNode;
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
  useEffect(() => {
    if ($ === null) {
      return noop;
    }
    return () => $.unsubscribe();
  }, [parent, $]);
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
  if (isFieldSetModel(model)) {
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
    if (isFieldModel(m)) {
      field = m;
    }
  }
  subscribeParent(parent, field, name);
  if (field) {
    const value = useValue$(field.value$, field.value);
    if (children) {
      return children(value);
    }
    return <>{value}</>;
  }
  return null;
}

export function useFieldArrayValue<Item, Child extends BasicModel<Item>>(field: string | FieldArrayModel<Item, Child>) {
  const { parent } = useFormContext();
  let model: FieldArrayModel<Item, Child> | null | undefined = null;
  if (typeof field === 'string') {
    let m = parent.get(field);
    if (m instanceof FieldArrayModel) {
      model = m;
    }
  } else if (isFieldArrayModel(model)) {
    model = field;
  }
  subscribeParent(parent, model, field);
  if (!model) {
    return null;
  }
  return model.children;
}
