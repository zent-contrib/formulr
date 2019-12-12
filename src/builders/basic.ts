import { BasicModel } from '../models';
import { IValidators } from '../validate';
import { Maybe } from '../maybe';

export abstract class BasicBuilder<Value, Model extends BasicModel<Value>> {
  protected _validators: IValidators<Value> = [];

  abstract build(defaultValue?: Maybe<Value>): Model;

  /**
   * 设置 builder 上的校验规则
   * @param validators 校验规则
   */
  validators(...validators: IValidators<Value>) {
    this._validators = validators;
    return this;
  }
}
