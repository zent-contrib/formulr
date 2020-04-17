import { of, Observable, from } from 'rxjs';
import { UnknownObject } from '../utils';
import { IValidator, isAsyncValidator, createAsyncValidator, ValidatorContext } from '..';
import { switchMap } from 'rxjs/operators';

export function when<F extends UnknownObject = UnknownObject, V = unknown>(condition: (formValue: F) => boolean) {
  return (validator: IValidator<V>) => {
    if (isAsyncValidator(validator)) {
      return createAsyncValidator<V>((value, context) => {
        const formValue = context.getFormValue() as F;
        if (!formValue) {
          throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
        }
        return condition(formValue) ? validator.validator(value, context) : null;
      });
    } else {
      return (value: V, context: ValidatorContext<V>) => {
        const formValue = context.getFormValue() as F;
        if (!formValue) {
          throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
        }
        return condition(formValue) ? validator(value, context) : null;
      };
    }
  };
}

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
