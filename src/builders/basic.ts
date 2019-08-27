import { BasicModel } from '../models';
import { IValidator } from '../validate';

export abstract class BasicBuilder<Value, Model extends BasicModel<Value>> {
  /**
   * @internal
   */
  readonly phantomValue!: Value;
  /**
   * @internal
   */
  readonly phantomModel!: Model;
  protected _validators: Array<IValidator<Value>> = [];

  abstract build(defaultValue?: Value | null): Model;

  validators(validators: Array<IValidator<Value>>) {
    this._validators = validators;
  }
}
