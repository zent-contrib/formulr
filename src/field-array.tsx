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

export interface IFieldArrayMeta<Item> {
  error: IErrors<Item[]>;
}

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string,
  factory: IFieldArrayChildFactory<Item>,
  validators?: ReadonlyArray<IValidator<readonly Item[]>>,
): [ReadonlyArray<Child>, IFieldArrayMeta<Item>, FieldArrayModel<Item>];

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: FieldArrayModel<Item>,
): [ReadonlyArray<Child>, IFieldArrayMeta<Item>, FieldArrayModel<Item>];

export function useFieldArray<Item, Child extends BasicModel<Item>>(
  field: string | FieldArrayModel<Item>,
  factory?: IFieldArrayChildFactory<Item>,
  validators?: ReadonlyArray<IValidator<readonly Item[]>>,
): [ReadonlyArray<Child>, IFieldArrayMeta<Item>, FieldArrayModel<Item>] {
  const ctx = useFormContext();
  let model: FieldArrayModel<Item>;
  if (typeof field === 'string') {
    if (ctx.strategy !== FormStrategy.View) {
      throw new Error();
    }
    const m = ctx.parent.children[field];
    if (!m || !(m instanceof FieldArrayModel)) {
      model = new FieldArrayModel(factory as IFieldArrayChildFactory<Item>);
      ctx.parent.children[field] = model as BasicModel<unknown>;
    } else {
      model = m;
    }
    model.validators = validators || [];
  } else {
    model = field;
  }
  const { error$ } = model;
  const error = useValue$(error$, error$.getValue());
  return [
    model.models$.getValue() as ReadonlyArray<Child>,
    {
      error,
    },
    model,
  ];
}
