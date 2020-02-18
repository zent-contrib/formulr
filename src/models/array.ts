import { BehaviorSubject } from 'rxjs';
import { BasicModel, isModel } from './basic';
import { ValidateOption } from '../validate';
import { ModelRef, isModelRef } from './ref';
import { BasicBuilder } from '../builders/basic';
import { Some, or } from '../maybe';
import { isFieldSetModel } from './set';

type FieldArrayChild<Item, Child extends BasicModel<Item>> =
  | Child
  | ModelRef<Item, FieldArrayModel<Item, Child>, Child>;

const FIELD_ARRAY_ID = Symbol('field-array');

class FieldArrayModel<Item, Child extends BasicModel<Item> = BasicModel<Item>> extends BasicModel<readonly Item[]> {
  /**
   * @internal
   */
  [FIELD_ARRAY_ID]!: boolean;

  readonly children$: BehaviorSubject<FieldArrayChild<Item, Child>[]>;

  private readonly childFactory: (defaultValue: Item) => FieldArrayChild<Item, Child>;

  /** @internal */
  constructor(childBuilder: BasicBuilder<Item, Child> | null, private readonly defaultValue: readonly Item[]) {
    super();
    this.childFactory = childBuilder
      ? (defaultValue: Item) => childBuilder.build(Some(defaultValue))
      : (defaultValue: Item) => new ModelRef<Item, FieldArrayModel<Item, Child>, Child>(null, Some(defaultValue), this);
    const children = this.defaultValue.map(this.childFactory);
    this.children$ = new BehaviorSubject(children);
  }

  /**
   * 重置 `FieldArray` 为初始值，初始值通过 `initialize` 设置；如果初始值不存在就使用默认值
   */
  reset() {
    const children = or(this.initialValue, this.defaultValue).map(this.childFactory);
    this.children$.next(children);
  }

  /**
   * 清除 `FieldArray` 的初始值，并将当前值设置为默认值
   */
  clear() {
    this.initialValue = undefined;
    const children = this.defaultValue.map(this.childFactory);
    this.children$.next(children);
  }

  /**
   * 获取 `FieldArray` 内的所有 model
   */
  get children() {
    return this.children$.getValue();
  }

  /**
   * `FieldArray` 内所有 model 是否都通过了校验
   */
  valid() {
    if (this.error$.getValue() !== null) {
      return false;
    }
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (isModelRef(child)) {
        const model = child.getModel();
        if (!model || !model.valid()) {
          return false;
        }
      } else if (isModel(child) && !child.valid()) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取 `FieldArray` 内的原始值
   */
  getRawValue(): (Item | null)[] {
    return this.children$.getValue().map(child => {
      if (isModelRef<Item, this, Child>(child)) {
        const model = child.getModel();
        return model ? model.getRawValue() : null;
      } else if (isModel<Item>(child)) {
        return child.getRawValue();
      }
      return null;
    });
  }

  /**
   * 获取 `FieldArray` 的用于表单提交的值，和原始值可能不一致
   */
  getSubmitValue(): (Item | null)[] {
    return this.children$.getValue().map(child => {
      if (isModelRef<Item, this, Child>(child)) {
        const model = child.getModel();
        return model ? model.getSubmitValue() : null;
      } else if (isModel<Item>(child)) {
        return child.getSubmitValue();
      }
      return null;
    });
  }

  /**
   * 修改 `FieldArray` 的值
   * @param value 要修改的值
   */
  patchValue(value: Item[]) {
    const children = this.children$.getValue();
    for (let i = 0; i < value.length; i += 1) {
      if (i >= children.length) {
        break;
      }
      const item = value[i];
      const model = children[i];
      if (isModelRef(model)) {
        const m = model.getModel();
        m && m.patchValue(item);
      } else if (isModel(model)) {
        model.patchValue(item);
      }
    }
    if (value.length <= children.length) {
      this.splice(value.length, children.length - value.length);
      return;
    }
    for (let i = children.length; i < value.length; i += 1) {
      const item = value[i];
      this.push(item);
    }
  }

  /**
   * 初始化 `FieldArray` 的值，同时设置 `initialValue`
   * @param values 要设置为初始化值的值
   */
  initialize(values: Item[]) {
    this.initialValue = Some(values);
    const children = values.map(this.childFactory);
    const { length } = children;
    for (let i = 0; i < length; i++) {
      this.registerChild(children[i]);
    }
    this.children$.next(children);
  }

  /**
   * 添加一批元素到 `FieldArray` 的末尾
   * @param items 待添加的值
   */
  push(...items: Item[]) {
    const nextChildren: FieldArrayChild<Item, Child>[] = this.children$.getValue().concat(items.map(this.childFactory));
    const { length } = nextChildren;
    for (let i = 0; i < length; i++) {
      this.registerChild(nextChildren[i]);
    }
    this.children$.next(nextChildren);
  }

  /**
   * 删除 `FieldArray` 最后的一个元素
   */
  pop() {
    const children = this.children$.getValue().slice();
    const child = children.pop();
    child && this.removeChild(child);
    this.children$.next(children);
    return child;
  }

  /**
   * 删除 `FieldArray` 第一个元素
   */
  shift() {
    const children = this.children$.getValue().slice();
    const child = children.shift();
    child && this.removeChild(child);
    this.children$.next(children);
    return child;
  }

  /**
   * 在 `FieldArray` 开头添加值
   * @param items 待添加的值·
   */
  unshift(...items: Item[]) {
    const nextChildren = items.map(this.childFactory).concat(this.children$.getValue());
    const { length } = nextChildren;
    for (let i = 0; i < length; i++) {
      this.registerChild(nextChildren[i]);
    }
    this.children$.next(nextChildren);
  }

  /**
   * 在 `FieldArray` 的指定位置删除指定数量的元素，并添加指定的新元素
   * @param start 开始删除的元素位置
   * @param deleteCount 删除的元素个数
   * @param items 待添加的元素值
   */
  splice(start: number, deleteCount = 0, ...items: readonly Item[]): FieldArrayChild<Item, Child>[] {
    const children = this.children$.getValue().slice();
    const insertedChildren = items.map(this.childFactory);
    const ret = children.splice(start, deleteCount, ...insertedChildren);
    this.children$.next(children);

    const { length: insertCount } = insertedChildren;
    for (let i = 0; i < insertCount; i++) {
      this.registerChild(insertedChildren[i]);
    }

    const { length: removeCount } = ret;
    for (let i = 0; i < removeCount; i++) {
      this.removeChild(ret[i]);
    }
    return ret;
  }

  /**
   * 执行 `FieldArray` 的校验
   * @param option 校验的参数
   */
  validate(option = ValidateOption.Default): Promise<any> {
    if (option & ValidateOption.IncludeChildrenRecursively) {
      return Promise.all(
        this.children$
          .getValue()
          .map(it => it.validate(option))
          .concat(this.triggerValidate(option)),
      );
    }
    return this.triggerValidate(option);
  }

  /**
   * 是否 `FieldArray` 所有元素都没有修改过
   */
  pristine() {
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.dirty()) {
        return false;
      }
    }
    return true;
  }

  /**
   * 是否 `FieldArray` 中任意元素有过修改
   *
   * `dirty === !pristine`
   */
  dirty() {
    return !this.pristine();
  }

  /**
   * 是否 `FieldArray` 任意元素被 touch 过
   */
  touched() {
    const children = this.children$.getValue();
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (child.touched()) {
        return true;
      }
    }
    return false;
  }

  /**
   * 递归地给child添加form引用
   * @param child
   */
  registerChild(child: FieldArrayChild<Item, Child>) {
    let model: Child | BasicModel<unknown> | null = null;
    if (isModelRef(child)) {
      model = child.getModel();
    } else if (isModel(child)) {
      model = child;
    }

    if (model) {
      model.form = this.form;
      if (isFieldSetModel(model)) {
        const { children } = model;
        const keys = Object.keys(model.children);
        const keysLength = keys.length;
        for (let index = 0; index < keysLength; index++) {
          const name = keys[index];
          const child = children[name];
          model.registerChild(name, child);
        }
      }
    }
  }

  /**
   * 递归地释放child
   * @param child
   */
  removeChild(child: FieldArrayChild<Item, Child>) {
    let model: Child | BasicModel<unknown> | null = null;
    if (isModelRef(child)) {
      model = child.getModel();
    } else if (isModel(child)) {
      model = child;
    }

    if (model) {
      model.dispose();
    }
  }

  dispose() {
    this.form = null;
    this.owner = null;
    const { children } = this;
    const len = children.length;
    for (let i = 0; i < len; i++) {
      const child = children[i];
      if (isModelRef(child)) {
        const model = child.getModel();
        model && model.dispose();
      } else if (isModel(child)) {
        child.dispose();
      }
    }
  }
}

FieldArrayModel.prototype[FIELD_ARRAY_ID] = true;

function isFieldArrayModel<Item, Child extends BasicModel<Item> = BasicModel<Item>>(
  maybeModel: any,
): maybeModel is FieldArrayModel<Item, Child> {
  return !!(maybeModel && maybeModel[FIELD_ARRAY_ID]);
}

export { FieldArrayChild, FieldArrayModel, isFieldArrayModel };
