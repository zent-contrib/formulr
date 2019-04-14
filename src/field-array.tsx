import {
  FieldArrayModel,
  IErrors,
  BasicModel,
  IFieldArrayChildFactory,
  FormStrategy,
} from './models';
import { useFormContext } from './context';
import { useValue$ } from './hooks';
import { IValidator } from './validate';
import { useEffect } from 'react';

export interface IFieldArrayMeta<Item> {
  error: IErrors<Item[]>;
}

export type IUseFieldArray<Item, Child extends BasicModel<Item>> = [
  ReadonlyArray<Child>,
  IFieldArrayMeta<Item>,
  FieldArrayModel<Item>
];

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string,
  factory: IFieldArrayChildFactory<Item>,
  validators?: ReadonlyArray<IValidator<ReadonlyArray<Item>>>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: FieldArrayModel<Item>,
): IUseFieldArray<Item, Child>;

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item>,
  factory?: IFieldArrayChildFactory<Item>,
  validators?: ReadonlyArray<IValidator<ReadonlyArray<Item>>>,
): IUseFieldArray<Item, Child> {
  const { parent, strategy } = useFormContext();
  let model: FieldArrayModel<Item>;
  if (typeof field === 'string') {
    if (strategy !== FormStrategy.View) {
      throw new Error();
    }
    const m = parent.children[field];
    if (!m || !(m instanceof FieldArrayModel)) {
      model = new FieldArrayModel(factory as IFieldArrayChildFactory<Item>);
      parent.children[field] = model as BasicModel<unknown>;
    } else {
      model = m;
    }
    model.validators = validators || [];
  } else {
    model = field;
  }
  const { error$ } = model;
  const error = useValue$(error$, error$.getValue());
  useEffect(() => {
    const $ = model.validate$.subscribe(parent.validate$);
    return $.unsubscribe.bind($);
  }, [model, parent]);
  return [
    model.models$.getValue() as ReadonlyArray<Child>,
    {
      error,
    },
    model,
  ];
}
