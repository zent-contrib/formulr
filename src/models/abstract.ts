import { Subject, BehaviorSubject } from 'rxjs';
import { ValidateOption, IMaybeError, ErrorSubscriber, IValidation, validate, IValidators } from '../validate';
import { switchMap } from 'rxjs/operators';
import { Maybe, None } from '../maybe';
import { memoize } from '../utils';
import { IForm, IModel } from './base';

const MODEL_ID = Symbol('model');

abstract class AbstractModel<Value> implements IModel<Value> {
  /** @internal */
  phantomValue!: Value;
  /**
   * @internal
   */
  readonly validate$ = new Subject<IValidation>();
  /**
   * @internal
   *
   * 校验规则数组
   */
  validators: IValidators<Value> = [];
  /**
   * @internal
   *
   * 初始值
   */
  initialValue: Maybe<Value> = None();

  /**
   * 组件 unmount 的时候删除 model
   */
  destroyOnUnmount = false;

  abstract owner: IModel<any> | null;

  /** @internal */
  [MODEL_ID]!: boolean;

  abstract getRawValue(): any;
  abstract getSubmitValue(): any;

  readonly error$ = new BehaviorSubject<IMaybeError<Value>>(null);

  private getForm = memoize<IModel<any> | null, IForm<Value> | null | undefined>(owner => {
    return owner?.form;
  });

  get form(): IForm<any> | null | undefined {
    return this.getForm(this.owner);
  }

  protected constructor(protected readonly id: string) {
    this.validate$.pipe(switchMap(validate(this))).subscribe(new ErrorSubscriber(this));
  }

  abstract pristine(): boolean;
  abstract touched(): boolean;
  abstract dirty(): boolean;
  abstract valid(): boolean;
  abstract patchValue(value: Value): void;
  abstract reset(): void;
  abstract clear(): void;
  abstract initialize(value: Value): void;
  abstract validate(option?: ValidateOption): Promise<any>;

  dispose() {
    this.owner = null;
  }

  protected triggerValidate(option: ValidateOption) {
    return new Promise<IMaybeError<Value>>((resolve, reject) => {
      this.validate$.next({
        option,
        resolve,
        reject,
      });
    });
  }

  /**
   * 获取 model 上的错误信息
   */
  get error() {
    return this.error$.getValue();
  }

  /**
   * 设置 model 上的错误信息
   */
  set error(error: IMaybeError<Value>) {
    this.error$.next(error);
  }
}

AbstractModel.prototype[MODEL_ID] = true;

function isModel<T>(maybeModel: any): maybeModel is AbstractModel<T> {
  return Boolean(maybeModel?.[MODEL_ID]);
}

export { AbstractModel, isModel };
