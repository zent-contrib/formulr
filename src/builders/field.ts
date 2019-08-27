import { FieldModel } from '../models';
import { BasicBuilder } from './basic';

export class FieldBuilder<Value> extends BasicBuilder<Value, FieldModel<Value>> {
  constructor(protected _defaultValue: Value) {
    super();
  }

  build(defaultValue?: Value | null) {
    const model = new FieldModel(defaultValue || this._defaultValue);
    model.validators = this._validators;
    return model;
  }
}
