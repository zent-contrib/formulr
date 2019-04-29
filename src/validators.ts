import { ValidatorResult, IValidator } from './validate';

const EMAIL_REGEXP = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

type ValidatorImpl<Value> = (input: Value) => boolean;

function makeValidator<Value>(name: string, impl: ValidatorImpl<Value>, message?: string): IValidator<Value> {
  const validator: IValidator<Value> = (value: Value): ValidatorResult<Value> => {
    if (isEmptyInputValue(value)) {
      return null;
    }
    return impl(value)
      ? {
          message,
          actual: value,
        }
      : null;
  };
  validator.name = name;
  return validator;
}

function isEmptyInputValue(value: any) {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

export function min(value: number, message?: string) {
  return makeValidator(
    'min',
    (input: string) => {
      const parsed = parseFloat(input);
      return !isNaN(parsed) && parsed < value;
    },
    message,
  );
}

export function max(value: number, message?: string) {
  return makeValidator(
    'max',
    (input: string) => {
      const parsed = parseFloat(input);
      return !isNaN(parsed) && parsed > value;
    },
    message,
  );
}

export function required(message?: string): IValidator<any> {
  function required(input: any) {
    return isEmptyInputValue(input)
      ? {
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
          message,
          actual: input,
        }
      : null;
  }
  pattern.name = `pattern(${regexp})`;
  return pattern;
}
