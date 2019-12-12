import { BasicBuilder } from './basic';
import { FieldSetModel, $FieldSetValue } from '../models';
import { Maybe, Some, None, or } from '../maybe';

export type $FieldSetBuilderChildren<ChildBuilders extends Record<string, BasicBuilder<any, any>>> = {
  [Key in keyof ChildBuilders]: ChildBuilders[Key] extends BasicBuilder<infer V, infer M> ? M : never;
};

export class FieldSetBuilder<
  ChildBuilders extends Record<string, BasicBuilder<any, any>>
> extends BasicBuilder<
  $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>,
  FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>
> {
  constructor(private readonly _childBuilders: ChildBuilders) {
    super();
  }

  build(defaultValues?: Maybe<$FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>>) {
    const defaults = or<Record<keyof $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>, any>>(
      defaultValues,
      {} as $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>,
    );
    const children = {} as $FieldSetBuilderChildren<ChildBuilders>;
    const childKeys: Array<keyof $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>> = Object.keys(
      this._childBuilders,
    );
    for (let i = 0; i < childKeys.length; i += 1) {
      const key = childKeys[i];
      const childBuilder = this._childBuilders[key];
      if (key in defaults) {
        children[key] = childBuilder.build(Some(defaults[key]));
      } else {
        children[key] = childBuilder.build(None());
      }
    }
    const model = new FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>(children);
    model.validators = this._validators;
    return model;
  }
}
