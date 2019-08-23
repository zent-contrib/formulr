import { BasicBuilder } from './basic';
import { FieldSetModel, $FieldSetChildren, $FieldSetValue } from '../models';

export type $FieldSetChildBuilders<Values extends Record<string, any>, Children extends $FieldSetChildren<Values>> = {
  [Key in keyof Values]: BasicBuilder<Values[Key], Children[Key]>
};

export type $FieldSetBuilderChildren<ChildBuilders extends Record<string, BasicBuilder<any, any>>> = {
  [Key in keyof ChildBuilders]: ChildBuilders[Key]['phantomModel']
};

export class FieldSetBuilder<ChildBuilders extends Record<string, BasicBuilder<any, any>>> extends BasicBuilder<
  $FieldSetValue<$FieldSetBuilderChildren<ChildBuilders>>,
  FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>
> {
  constructor(private readonly _childBuilders: ChildBuilders) {
    super();
  }

  build() {
    const children = {} as Record<string, any>;
    const childKeys = Object.keys(this._childBuilders);
    for (let i = 0; i < childKeys.length; i += 1) {
      const key = childKeys[i];
      const childBuilder = this._childBuilders[key];
      children[key] = childBuilder.build();
    }
    const model = new FieldSetModel<$FieldSetBuilderChildren<ChildBuilders>>(children as any);
    model.validators = this._validators;
    return model;
  }
}
