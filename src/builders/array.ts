import { BasicBuilder } from './basic';
import { FieldArrayModel } from '../models';
import { Maybe, or } from '../maybe';

export class FieldArrayBuilder<ChildBuilder extends BasicBuilder<any, any>> extends BasicBuilder<
  readonly (ChildBuilder['phantomValue'] | null)[],
  FieldArrayModel<ChildBuilder['phantomValue'], ChildBuilder['phantomModel']>
> {
  private _defaultValue: readonly ChildBuilder['phantomValue'][] = [];

  constructor(private readonly childBuilder: ChildBuilder) {
    super();
  }

  defaultValue(defaultValue: readonly ChildBuilder['phantomValue'][]) {
    this._defaultValue = defaultValue;
  }

  build(
    defaultValue?: Maybe<readonly (ChildBuilder['phantomValue'] | null)[]>,
  ): FieldArrayModel<ChildBuilder['phantomValue'], ChildBuilder['phantomModel']> {
    const model = new FieldArrayModel<ChildBuilder['phantomValue'], ChildBuilder['phantomModel']>(
      this.childBuilder,
      or(defaultValue, this._defaultValue),
    );
    model.validators = this._validators;
    return model;
  }
}
