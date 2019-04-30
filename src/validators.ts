import Decimal from 'big.js';
import { IValidator, IValidateResult } from './validate';

const EMAIL_REGEXP = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

function isEmptyInputValue(value: any) {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

export function min(limit: number | string, message?: string) {
  return function min(value: number | string): IValidateResult<number | string> | null {
    if (isEmptyInputValue(value)) {
      return null;
    }
    try {
      const decimal = new Decimal(value);
      if (decimal.lt(limit)) {
        return {
          name: 'min',
          actual: value,
          limit,
          message,
        };
      }
    } catch (error) {
      return {
        name: 'min',
        actual: value,
        limit,
        message,
      };
    }
    return null;
  };
}

export function max(limit: number, message?: string) {
  return function max(value: number | string): IValidateResult<number | string> | null {
    if (isEmptyInputValue(value)) {
      return null;
    }
    try {
      const decimal = new Decimal(value);
      if (decimal.gt(limit)) {
        return {
          name: 'max',
          actual: value,
          limit,
          message,
        };
      }
    } catch (error) {
      return {
        name: 'max',
        actual: value,
        limit,
        message,
      };
    }
    return null;
  };
}

export function required(message?: string): IValidator<any> {
  function required(input: any) {
    return isEmptyInputValue(input)
      ? {
          name: 'required',
          message,
          actual: input,
        }
      : null;
  }
  return required;
}

export function requiredTrue(message?: string): IValidator<boolean> {
  function requiredTrue(input: boolean) {
    return input === true
      ? null
      : {
          name: 'requiredTrue',
          message,
          expect: true,
          actual: input,
        };
  }
  return requiredTrue;
}

export function email(message?: string): IValidator<string> {
  function email(input: string) {
    return EMAIL_REGEXP.test(input)
      ? null
      : {
          name: 'email',
          message,
          actual: input,
        };
  }
  return email;
}

export interface IWithLength {
  length: number;
}

export function minLength<T extends IWithLength>(length: number, message?: string): IValidator<T> {
  function minLength(input: T) {
    return input.length < length
      ? {
          name: 'minLength',
          message,
          actual: input,
          limit: length,
        }
      : null;
  }
  return minLength;
}

export function maxLength<T extends IWithLength>(length: number, message?: string): IValidator<T> {
  function maxLength(input: T) {
    return input.length > length
      ? {
          name: 'maxLength',
          message,
          actual: input,
          limit: length,
        }
      : null;
  }
  return maxLength;
}

export function pattern(regexp: RegExp, message?: string): IValidator<string> {
  function pattern(input: string) {
    return regexp.test(input)
      ? {
          name: 'pattern',
          message,
          actual: input,
          pattern: regexp,
        }
      : null;
  }
  return pattern;
}
