import { FieldModel } from '../models';
import { BasicBuilder } from './basic';
import { Maybe, or } from '../maybe';

export class FieldBuilder<Value> extends BasicBuilder<Value, FieldModel<Value>> {
  constructor(protected _defaultValue: Value) {
    super();
  }

  build(defaultValue?: Maybe<Value>) {
    const model = new FieldModel(or(defaultValue, this._defaultValue));
    model.validators = this._validators;
    return model;
  }
}
