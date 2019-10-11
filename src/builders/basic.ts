import { BasicModel } from '../models';
import { Validators } from '../validate';
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
  protected _validators: Validators<Value> = [];

  abstract build(defaultValue?: Maybe<Value>): Model;

  validators(...validators: Validators<Value>) {
    this._validators = validators;
    return this;
  }
}
