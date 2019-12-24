import { Message, ValidateCondition, Validation, IValidator } from './typings';
import { isFunction, then, maybePromise } from './utils';
import { SYMBOL_REQUIRED } from '.';
import { IMaybeError, ValidatorContext, createAsyncValidator } from '../validate';

export interface ICreateValidatorOptions<Value, FormValue> {
  name: string;
  valid: Validation<Value>;
  condition?: ValidateCondition<FormValue>;
  message?: Message<FormValue>;
  limit?: unknown,
  expect?: Value,
  async?: boolean;
}

export function createValidator<
  Value,
  FormValue extends {},
>(options: ICreateValidatorOptions<Value, FormValue>): IValidator<Value, FormValue> {
  const {
    name,
    valid,
    condition = () => true,
    message,
    limit,
    expect,
    async,
  } = options;
  const validator = (val: Value, ctx: ValidatorContext<Value>) => {
    const form = ctx.getFormValue<FormValue>();
    if (!form) return maybePromise(async);
    const shouldValidate = isFunction(condition) ? condition(form) : condition
    return then(
      shouldValidate,
      shouldValidate => shouldValidate ? (
        then(
          isFunction(message) ? message(form) : (message || ''),
          msg => maybePromise<IMaybeError<Value>>(
            async,
            !valid(val) ? {
              message: msg,
              actual: val,
              limit,
              expect,
              name,
            } : null
          )
        )
      ) : maybePromise(async)
    );
  };
  /* tslint:disable no-shadowed-variable */
  validator.if = (condition: ValidateCondition<FormValue>) => {
    const validator = createValidator<Value, FormValue>({
      name: name + '-if',
      message,
      valid,
      limit,
      expect,
      condition,
      async: false,
    });
    validator.async = () => {
      const validator = createAsyncValidator(
        // @ts-ignore
        createValidator({
          name: 'async-' + name + '-if',
          valid,
          message,
          limit,
          expect,
          condition,
          async: true,
        })
      );
      markForRequired(name, validator);
      return validator;
    };
    return markForRequired(name, validator);
  };
  validator.async = () => {
    const validator = createAsyncValidator(
      // @ts-ignore
      createValidator({
        name: 'async-' + name,
        valid,
        message,
        limit,
        expect,
        async: true,
      })
    );
    markForRequired(name, validator);
    return validator;
  };
  return markForRequired(name, validator as IValidator<Value, FormValue>);
}

function markForRequired<Value, FormValue extends {}>(name: string, validator: IValidator<Value, FormValue>) {
  validator.$$id = name === 'required' ? SYMBOL_REQUIRED : undefined;
  return validator;
}
