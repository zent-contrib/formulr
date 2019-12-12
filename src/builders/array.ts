import { BasicBuilder } from './basic';
import { FieldArrayModel } from '../models';
import { Maybe, or } from '../maybe';

type $ChildBuilderValue<Builder extends BasicBuilder<any, any>> = Builder extends BasicBuilder<infer V, infer M> ? V : never;
type $ChildBuilderModel<Builder extends BasicBuilder<any, any>> = Builder extends BasicBuilder<infer V, infer M> ? M : never;

export class FieldArrayBuilder<ChildBuilder extends BasicBuilder<any, any>> extends BasicBuilder<
  readonly ($ChildBuilderValue<ChildBuilder>)[],
  FieldArrayModel<$ChildBuilderValue<ChildBuilder>, $ChildBuilderModel<ChildBuilder>>
> {
  private _defaultValue: readonly $ChildBuilderValue<ChildBuilder>[] = [];

  constructor(private readonly childBuilder: ChildBuilder) {
    super();
  }

  defaultValue(defaultValue: readonly $ChildBuilderValue<ChildBuilder>[]) {
    this._defaultValue = defaultValue;
    return this;
  }

  build(
    defaultValue?: Maybe<readonly ($ChildBuilderValue<ChildBuilder>)[]>,
  ): FieldArrayModel<$ChildBuilderValue<ChildBuilder>, $ChildBuilderModel<ChildBuilder>> {
    const model = new FieldArrayModel<$ChildBuilderValue<ChildBuilder>, $ChildBuilderModel<ChildBuilder>>(
      this.childBuilder,
      or(defaultValue, this._defaultValue),
    );
    model.validators = this._validators;
    return model;
  }
}
