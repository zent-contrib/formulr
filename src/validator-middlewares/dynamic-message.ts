import { UnknownObject } from '../utils';
import { IValidator, isAsyncValidator, createAsyncValidator, IMaybeError, ValidatorContext } from '../validate';
import { isObservable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

function withMessage<F extends UnknownObject = UnknownObject, V = unknown>(
  maybeError: IMaybeError<V>,
  messagenerator: (formValue: F) => string,
  formValue: F,
) {
  return maybeError && { ...maybeError, message: messagenerator(formValue) };
}

/**
 * 为校验错误设定动态的message
 * @param messagenerator
 */
export function dynamicMessage<F extends UnknownObject = UnknownObject, V = unknown>(
  messagenerator: (formValue: F) => string,
) {
  return (validator: IValidator<V>) => {
    if (isAsyncValidator(validator)) {
      return createAsyncValidator<V>((value, context) => {
        const formValue = context.getFormValue() as F;
        if (!formValue) {
          throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
        }
        const result = validator.validator(value, context);

        if (isObservable(result)) {
          return result.pipe(
            switchMap(maybeError => {
              return of(withMessage(maybeError, messagenerator, formValue));
            }),
          );
        } else if (result instanceof Promise) {
          return result.then(maybeError => withMessage(maybeError, messagenerator, formValue));
        } else {
          return result;
        }
      });
    } else {
      return (value: V, context: ValidatorContext<V>) => {
        const formValue = context.getFormValue() as F;
        if (!formValue) {
          throw new Error('Validation is aborted due to context.getFormValue() returned null or undefined.');
        }
        return withMessage(validator(value, context), messagenerator, formValue);
      };
    }
  };
}
