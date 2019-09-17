import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { FieldSetModel } from './set';
import { BasicModel } from './basic';
import { ValidateOption } from '../validate';

enum FormStrategy {
  Model,
  View,
}

const FORM = Symbol('form');

class FormModel<
  Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>
> extends FieldSetModel<Children> {
  /**
   * @internal
   */
  [FORM]!: boolean;

  /** @internal */
  private readonly workingValidators = new Set<Observable<unknown>>();
  readonly isValidating$ = new BehaviorSubject(false);
  readonly change$ = new Subject<void>();

  constructor(public readonly children: Children) {
    super(children);
    this.form = this;
  }

  validate(option: ValidateOption = ValidateOption.Default) {
    return super.validate(option | ValidateOption.IncludeChildren);
  }

  /** @internal */
  addWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.add(v);
    this.updateIsValidating();
  }

  /** @internal */
  removeWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.delete(v);
    this.updateIsValidating();
  }

  /** @internal */
  private updateIsValidating() {
    const isValidating = this.workingValidators.size > 0;
    if (isValidating !== this.isValidating$.getValue()) {
      this.isValidating$.next(isValidating);
    }
  }
}

FormModel.prototype[FORM] = true;

function isFormModel<Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>>(
  maybeModel: any,
): maybeModel is FormModel<Children> {
  return !!(maybeModel && maybeModel[FORM]);
}

export { FormStrategy, FormModel, isFormModel };
