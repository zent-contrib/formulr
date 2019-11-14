import { Subject, BehaviorSubject } from 'rxjs';
import { ValidateOption, IMaybeError, ErrorSubscriber, IValidation, validate, IValidators } from '../validate';
import { switchMap } from 'rxjs/operators';
import { FieldSetModel } from './set';
import { ModelRef } from './ref';
import { FormModel } from './form';
import { Maybe, None } from '../maybe';

interface IModel<Value> {
  getRawValue(): any;
  pristine(): boolean;
  touched(): boolean;
  dirty(): boolean;
  valid(): boolean;
  patchValue(value: Value): void;
  validate(strategy: ValidateOption): void;
  reset(): void;
  clear(): void;
  initialize(value: Value): void;
  error: IMaybeError<Value>;
}

let uniqueId = 0;

const MODEL_ID = Symbol('model');

abstract class BasicModel<Value> implements IModel<Value> {
  /** @internal */
  id: string;
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
  /** @internal */
  owner: FieldSetModel<any> | ModelRef<any, any, any> | null = null;
  /** @internal */
  form: FormModel<any> | null = null;

  /**
   * 组件 unmount 的时候删除 model
   */
  destroyOnUnmount = false;

  /** @internal */
  [MODEL_ID]!: boolean;

  abstract getRawValue(): any;
  abstract getSubmitValue(): any;

  readonly error$ = new BehaviorSubject<IMaybeError<Value>>(null);

  constructor() {
    this.id = `model-${uniqueId}`;
    uniqueId += 1;
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

  protected triggerValidate(option: ValidateOption) {
    return new Promise((resolve, reject) => {
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

BasicModel.prototype[MODEL_ID] = true;

function isModel<T>(maybeModel: any): maybeModel is BasicModel<T> {
  return !!(maybeModel && maybeModel[MODEL_ID]);
}

export { IModel, BasicModel, isModel };
