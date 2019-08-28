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
  protected _validators: readonly IValidator<Value>[] = [];

  abstract build(defaultValue?: Value | null): Model;

  validators(validators: readonly IValidator<Value>[]) {
    this._validators = validators;
  }
}
