import { BasicModel } from '../models';
import { IValidator } from '../validate';
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
  protected _validators: readonly IValidator<Value>[] = [];

  abstract build(defaultValue?: Maybe<Value>): Model;

  validators(validators: readonly IValidator<Value>[]) {
    this._validators = validators;
  }
}
