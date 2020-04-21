import { of, Observable, from } from 'rxjs';
import { UnknownObject } from '../utils';
import { IValidator, isAsyncValidator, createAsyncValidator, ValidatorContext } from '..';
import { switchMap } from 'rxjs/operators';

/**
 * 条件校验，条件函数返回true时才会执行校验，否则直接视为校验通过
 * @param condition
 */
export function when<F extends UnknownObject = UnknownObject, S extends UnknownObject = UnknownObject, V = unknown>(
  condition: (formValue: F, ownerValue: S) => boolean,
) {
  return (validator: IValidator<V>) => {
    if (isAsyncValidator(validator)) {
      return createAsyncValidator<V>((value, context) => {
        const formValue = context.getFormValue() as F;
        if (!formValue) {
          throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
        }
        const fieldSetValue = context.getSectionValue() as S;
        if (!fieldSetValue) {
          throw new Error('Validation is aborted due to context.getSectionValue() returned null or undefined.');
        }
        return condition(formValue, fieldSetValue) ? validator.validator(value, context) : null;
      });
    } else {
      return (value: V, context: ValidatorContext<V>) => {
        const formValue = context.getFormValue() as F;
        if (!formValue) {
          throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
        }
        const fieldSetValue = context.getSectionValue() as S;
        if (!fieldSetValue) {
          throw new Error('Validation is aborted due to context.getSectionValue() returned null or undefined.');
        }
        return condition(formValue, fieldSetValue) ? validator(value, context) : null;
      };
    }
  };
}

/**
 * ValidatorMiddlewares.when的异步版本，接收异步的条件函数
 * @param condition
 */
export function whenAsync<F extends UnknownObject = UnknownObject, V = unknown>(
  condition: (formValue: F) => Promise<boolean> | Observable<boolean>,
) {
  return (validator: IValidator<V>) => {
    return createAsyncValidator<V>((value, context) => {
      const formValue = context.getFormValue() as F;
      if (!formValue) {
        throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
      }
      return from(condition(formValue)).pipe(
        switchMap((shouldValidate) => {
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
