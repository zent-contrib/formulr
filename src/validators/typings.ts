import { Primitive } from 'utility-types';
import { ISyncValidator, IAsyncValidator } from '..';

export type Nullable<T> = T | null | undefined;
export type MaybePromise<T> = Promise<T> | T;
export type PlainObject = IStringIndexed & INumberIndexed;
interface IStringIndexed {
  [key: string]: Primitive | IStringIndexed | INumberIndexed;
}
interface INumberIndexed {
  [key: number]: Primitive | IStringIndexed | INumberIndexed;
}
export type Message<F extends {} = PlainObject> = string | ((form: F) => string);
export type Validation<Value> = (val: Value) => boolean;
export type ValidateCondition<F extends {} = PlainObject> = ((form: F) => Nullable<boolean> | Promise<Nullable<boolean>>) | boolean;
export interface IValidator<Value, FormValue extends {} = PlainObject> extends ISyncValidator<Value> {
  async<ValueWithAsync = Value>(): IAsyncValidator<ValueWithAsync>;
  if<ValueWithIf = Value>(condition: ValidateCondition<FormValue>): IValidatorWithIf<ValueWithIf>;
}
interface IValidatorWithIf<ValueWithIf> extends ISyncValidator<ValueWithIf> {
  async<ValueWithAsyncIf = ValueWithIf>(): IAsyncValidator<ValueWithAsyncIf>;
}
