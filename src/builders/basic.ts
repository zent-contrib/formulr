import { BasicModel } from '../models';
import { IValidators } from '../validate';
import { Maybe } from '../maybe';

export abstract class BasicBuilder<Value, Model extends BasicModel<Value>> {
  /**
   * @internal
   */
  readonly phantomValue!: Value;
  /**
   * @internal
   */
  readonly phantomModel!: Model;
  protected _validators: IValidators<Value> = [];

  abstract build(defaultValue?: Maybe<Value>): Model;

  validators(...validators: IValidators<Value>) {
    this._validators = validators;
    return this;
  }
}
