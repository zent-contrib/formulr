import { BasicBuilder } from './basic';
import { FieldArrayModel } from '../models';

export class FieldArrayBuilder<ChildBuilder extends BasicBuilder<any, any>> extends BasicBuilder<
  Array<ChildBuilder['phantomValue'] | null>,
  FieldArrayModel<ChildBuilder['phantomValue'], ChildBuilder['phantomModel']>
> {
  private _defaultValue: ChildBuilder['phantomValue'][] = [];

  constructor(private readonly childBuilder: ChildBuilder) {
    super();
  }

  defaultValue(defaultValue: ChildBuilder['phantomValue'][]) {
    this._defaultValue = defaultValue;
  }

  build(
    defaultValue?: (ChildBuilder['phantomValue'] | null)[],
  ): FieldArrayModel<ChildBuilder['phantomValue'], ChildBuilder['phantomModel']> {
    const model = new FieldArrayModel<ChildBuilder['phantomValue'], ChildBuilder['phantomModel']>(
      this.childBuilder,
      defaultValue || this._defaultValue,
    );
    model.validators = this._validators;
    return model;
  }
}
