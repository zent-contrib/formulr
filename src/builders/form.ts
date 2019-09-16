import { BasicBuilder } from './basic';
import { FieldSetModel, $FieldSetValue } from '../models';
import { $FieldSetBuilderChildren } from './set';

export class FormBuilder<ChildBuilders extends Record<string, BasicBuilder<any, any>>> extends BasicBuilder<
  $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>,
  FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>
> {
  constructor(private readonly _childBuilders: ChildBuilders) {
    super();
  }

  build(defaultValues?: Record<string, any> | null) {
    defaultValues = defaultValues || {};
    const children = {} as $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>;
    const childKeys = Object.keys(this._childBuilders);
    for (let i = 0; i < childKeys.length; i += 1) {
      const key = childKeys[i];
      const childBuilder = this._childBuilders[key];
      children[key] = childBuilder.build(defaultValues[key]);
    }
    const model = new FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>(children);
    model.validators = this._validators;
    return model;
  }
}
