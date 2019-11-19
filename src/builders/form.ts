import { BasicBuilder } from './basic';
import { $FieldSetValue, FormModel, BasicModel } from '../models';
import { $FieldSetBuilderChildren } from './set';
import { Maybe, Some, or } from '../maybe';

export class FormBuilder<
  ChildBuilders extends Record<string, Builder>,
  Builder extends BasicBuilder<unknown, Model>,
  Model extends BasicModel<unknown>
> extends BasicBuilder<
  $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>,
  FormModel<$FieldSetBuilderChildren<ChildBuilders>>
> {
  constructor(private readonly _childBuilders: ChildBuilders) {
    super();
  }

  build(defaultValues?: Maybe<$FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>>) {
    const defaults = or<Record<keyof ChildBuilders, any>>(defaultValues, {} as $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>);
    const children = {} as $FieldSetBuilderChildren<ChildBuilders>;
    const childKeys: Array<keyof ChildBuilders> = Object.keys(this._childBuilders);
    for (let i = 0; i < childKeys.length; i += 1) {
      const key = childKeys[i];
      const childBuilder = this._childBuilders[key];
      if (key in defaults) {
        children[key] = childBuilder.build(Some(defaults[key]));
      } else {
        children[key] = childBuilder.build(null);
      }
    }
    const model = new FormModel<$FieldSetBuilderChildren<ChildBuilders>>(children);
    model.validators = this._validators;
    return model;
  }
}
