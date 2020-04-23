import { of, Observable, from } from 'rxjs';
import { IValidator, isAsyncValidator, createAsyncValidator, ValidatorContext } from '..';
import { switchMap } from 'rxjs/operators';

/**
 * 条件校验，条件函数返回true时才会执行校验，否则直接视为校验通过
 * @param condition
 */
export function when<V = unknown>(condition: (ctx: ValidatorContext<V>) => boolean) {
  return (validator: IValidator<V>) => {
    if (isAsyncValidator(validator)) {
      return createAsyncValidator<V>((value, context) => {
        return condition(context) ? validator.validator(value, context) : null;
      });
    } else {
      return (value: V, context: ValidatorContext<V>) => {
        return condition(context) ? validator(value, context) : null;
      };
    }
  };
}

/**
 * ValidatorMiddlewares.when的异步版本，接收异步的条件函数
 * @param condition
 */
export function whenAsync<V = unknown>(
  condition: (formValue: ValidatorContext<V>) => Promise<boolean> | Observable<boolean>,
) {
  return (validator: IValidator<V>) => {
    return createAsyncValidator<V>((value, context) => {
      return from(condition(context)).pipe(
        switchMap(shouldValidate => {
          if (shouldValidate) {
            return isAsyncValidator(validator)
              ? validator.validator(value, context) || of(null)
              : of(validator(value, context));
          }
          return of(null);
        }),
      );
    });
  };
}
