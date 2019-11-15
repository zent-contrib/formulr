import { BehaviorSubject, Observable } from 'rxjs';
import { FieldSetModel } from './set';
import { BasicModel } from './basic';
import { ValidateOption } from '../validate';

enum FormStrategy {
  /**
   * 指定 model 模式
   */
  Model,

  /**
   * 视图驱动模式
   */
  View,
}

const FORM_ID = Symbol('form');

class FormModel<
  Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>
> extends FieldSetModel<Children> {
  /**
   * @internal
   */
  [FORM_ID]!: boolean;

  /** @internal */
  private readonly workingValidators = new Set<Observable<unknown>>();
  readonly isValidating$ = new BehaviorSubject(false);

  constructor(public readonly children: Children) {
    super(children);
    this.form = this;
  }

  /**
   * 执行整个 `Form` 的校验，会递归触发所有表单元素的校验
   * @param option 表单校验的参数
   */
  validate(option: ValidateOption = ValidateOption.Default) {
    return super.validate(option | ValidateOption.IncludeChildrenRecursively);
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

FormModel.prototype[FORM_ID] = true;

function isFormModel<Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>>(
  maybeModel: any,
): maybeModel is FormModel<Children> {
  return !!(maybeModel && maybeModel[FORM_ID]);
}

export { FormStrategy, FormModel, isFormModel };
