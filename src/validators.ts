import { Observable } from 'rxjs';

const EMAIL_REGEXP = /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export type ValidatorResult =
  | string
  | null
  | Promise<string | null>
  | Observable<string | null>;

type ValidatorImpl<Value> = (input: Value) => boolean;

export interface IValidator<Value> {
  (input: Value): ValidatorResult;
  name: string | symbol;
}

function makeValidator<Value>(
  name: string,
  impl: ValidatorImpl<Value>,
  error: string,
): IValidator<Value> {
  const validator: IValidator<Value> = (value: Value): ValidatorResult => {
    if (isEmptyInputValue(value)) {
      return null;
    }
    return impl(value) ? error : null;
  };
  validator.name = name;
  return validator;
}

function isEmptyInputValue(value: any) {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

export function min(value: number, error: string) {
  return makeValidator(
    'min',
    (input: string) => {
      const parsed = parseFloat(input);
      return !isNaN(parsed) && parsed < value;
    },
    error,
  );
}

export function max(value: number, error: string) {
  return makeValidator(
    'max',
    (input: string) => {
      const parsed = parseFloat(input);
      return !isNaN(parsed) && parsed > value;
    },
    error,
  );
}

export function required(error: string) {
  function required(input: any) {
    return isEmptyInputValue(input) ? error : null;
  }
  return required;
}

export function requiredTrue(error: string) {
  function requiredTrue(input: boolean) {
    return input === true ? null : error;
  }
  return requiredTrue;
}

export function email(error: string) {
  function email(input: string) {
    return EMAIL_REGEXP.test(input) ? null : error;
  }
  return email;
}

export function minLength(len: number, error: string) {
  function minLength(input: string | unknown[]) {
    return input.length < len ? error : null;
  }
  return minLength;
}

export function maxLength(len: number, error: string) {
  function maxLength(input: string | unknown[]) {
    return input.length > len ? error : null;
  }
  return maxLength;
}

export function pattern(regexp: RegExp, error: string) {
  function pattern(input: string) {
    return regexp.test(input) ? error : null;
  }
  pattern.name = `pattern(${regexp})`;
  return pattern;
}
