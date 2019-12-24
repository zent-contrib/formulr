import Decimal from 'big.js';
import { IValidator } from '../validate';
import { createValidator } from './create-validator';
import { Message, PlainObject } from './typings';

const EMAIL_REGEXP = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

function isEmptyInputValue(value: any) {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

export const SYMBOL_REQUIRED = Symbol('required');

/**
 * 限制一个值的最小值
 * @param limit 允许的最小值（包含自身）
 * @param message 错误信息
 */
export function min<Value extends number | string, FormValue extends {} = PlainObject>(limit: number | string, message?: Message<FormValue>) {
  function min(value: Value) {
    if (isEmptyInputValue(value)) {
      return true;
    }
    try {
      const decimal = new Decimal(value);
      if (decimal.lt(limit)) {
        return false;
      }
    } catch (error) {
      return false;
    }
    return true;
  };
  return createValidator<Value, FormValue>({
    valid: min,
    name: 'min',
    message,
    limit: limit as number,
  });
}

/**
 * 限制一个值的最大值
 * @param limit 允许的最大值（包含自身）
 * @param message 错误信息
 */
export function max<Value extends number | string, FormValue extends {} = PlainObject>(limit: number | string, message?: Message<FormValue>) {
  function max(value: Value) {
    if (isEmptyInputValue(value)) {
      return true;
    }
    try {
      const decimal = new Decimal(value);
      if (decimal.gt(limit)) {
        return false;
      }
    } catch (error) {
      return false;
    }
    return true;
  };
  return createValidator<Value, FormValue>({
    valid: max,
    name: 'min',
    message,
    limit,
  });
}

/**
 * 限制一个值不为 `null`/`undefined`，并且长度不为零
 * @param message 错误信息
 */
export function required<Value, FormValue extends {} = PlainObject>(message?: Message<FormValue>) {
  function required(input: Value) {
    return !isEmptyInputValue(input);
  }
  return createValidator<Value, FormValue>({
    valid: required,
    name: 'required',
    message,
  });
}

/**
 * 限制一个值必须为 `true`
 * @param message 错误信息
 */
export function requiredTrue<FormValue extends {} = PlainObject>(message?: Message<FormValue>) {
  function requiredTrue(input: boolean) {
    return input === true;
  }
  return createValidator<boolean, FormValue>({
    valid: requiredTrue,
    message,
    expect: true,
    name: 'requiredTrue',
  });
}

/**
 * 限制一个值是合法的 email 地址，规则和 Angular 使用的一致
 * @param message 错误信息
 */
export function email<FormValue extends {} = PlainObject>(message?: Message<FormValue>) {
  function email(input: string) {
    return EMAIL_REGEXP.test(input);
  }
  return createValidator<string, FormValue>({
    name: 'email',
    message,
    valid: email,
    limit: EMAIL_REGEXP,
  });
}

export interface IWithLength {
  length: number;
}

/**
 * 限制一个值的最小长度，通过 `.length` 属性判断
 * @param length 允许的最小长度（包含自身）
 * @param message 错误信息
 */
export function minLength<T extends IWithLength, FormValue extends {} = PlainObject>(length: number, message?: Message<FormValue>) {
  function minLength(input: T) {
    return input.length >= length;
  }
  return createValidator<T, FormValue>({
    name: 'minLength',
    message,
    limit: length,
    valid: minLength,
  });
}

/**
 * 限制一个值的最大长度，通过 `.length` 属性判断
 * @param length 允许的最大长度（包含自身）
 * @param message 错误信息
 */
export function maxLength<T extends IWithLength, FormValue extends {} = PlainObject>(length: number, message?: Message<FormValue>): IValidator<T> {
  function maxLength(input: T) {
    return input.length <= length;
  }
  return createValidator<T, FormValue>({
    name: 'maxLength',
    message,
    limit: length,
    valid: maxLength,
  });
}

/**
 * 限制一个字符串必须匹配一个正则表达式
 * @param regexp 要匹配的正则表达式
 * @param message 错误信息
 */
export function pattern<FormValue extends {} = PlainObject>(regexp: RegExp, message?: Message<FormValue>) {
  function pattern(input: string) {
    return regexp.test(input);
  }
  return createValidator<string, FormValue>({
    name: 'pattern',
    message,
    valid: pattern,
    limit: regexp,
  });
}
