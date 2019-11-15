import { FieldArrayBuilder } from './array';
import { FieldBuilder } from './field';
import { FieldSetBuilder } from './set';
import { BasicBuilder } from './basic';
import { FormBuilder } from './form';
import { BasicModel } from '../models';

export * from './array';
export * from './field';
export * from './set';
export * from './form';
export * from './basic';

export function field<T>(defaultValue: T) {
  return new FieldBuilder(defaultValue);
}

export function array<ChildBuilder extends BasicBuilder<any, any>>(
  childBuilder: ChildBuilder,
) {
  return new FieldArrayBuilder<ChildBuilder>(childBuilder);
}

/**
 * 创建一个 `FieldSet` builder
 * @param childBuilders `FieldSet` 每个字段对应的 builder 对象，其值可以是 `field`、`array` 或者 `set` 的返回值
 */
export function set<
  ChildBuilders extends Record<string, Builder>,
  Builder extends BasicBuilder<unknown, Model>,
  Model extends BasicModel<unknown>
>(childBuilders: ChildBuilders) {
  return new FieldSetBuilder<ChildBuilders>(childBuilders);
}

/**
 * 创建一个 `Form` builder，是最顶层的 builder 对象
 * @param childBuilders `Form` 每个字段对应的 builder 对象，其值可以是 `field`、`array` 或者 `set` 的返回值
 */
export function form<
  ChildBuilders extends Record<string, Builder>,
  Builder extends BasicBuilder<unknown, Model>,
  Model extends BasicModel<unknown>
>(childBuilders: ChildBuilders) {
  return new FormBuilder<ChildBuilders, Builder, Model>(childBuilders);
}
