import { FieldModel } from '../models';
import { BasicBuilder } from './basic';

export class FieldBuilder<Value> extends BasicBuilder<Value, FieldModel<Value>> {
  constructor(protected _defaultValue: Value) {
    super();
  }

  build() {
    const model = new FieldModel(this._defaultValue);
    model.validators = this._validators;
    return model;
  }
}
