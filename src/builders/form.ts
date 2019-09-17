import { BasicBuilder } from './basic';
import { FieldSetModel, $FieldSetValue } from '../models';
import { $FieldSetBuilderChildren } from './set';
import { Maybe, Some, or } from '../maybe';

export class FormBuilder<ChildBuilders extends Record<string, BasicBuilder<any, any>>> extends BasicBuilder<
  $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>,
  FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>
> {
  constructor(private readonly _childBuilders: ChildBuilders) {
    super();
  }

  build(defaultValues?: Maybe<Record<string, any>>) {
    const defaults = or<Record<string, any>>(defaultValues, {});
    const children = {} as $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>;
    const childKeys = Object.keys(this._childBuilders);
    for (let i = 0; i < childKeys.length; i += 1) {
      const key = childKeys[i];
      const childBuilder = this._childBuilders[key];
      if (key in defaults) {
        children[key] = childBuilder.build(Some(defaults[key]));
      } else {
        children[key] = childBuilder.build(null);
      }
    }
    const model = new FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>(children);
    model.validators = this._validators;
    return model;
  }
}
