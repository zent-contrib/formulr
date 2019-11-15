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

export function set<
  ChildBuilders extends Record<string, Builder>,
  Builder extends BasicBuilder<unknown, Model>,
  Model extends BasicModel<unknown>
>(childBuilders: ChildBuilders) {
  return new FieldSetBuilder<ChildBuilders>(childBuilders);
}

export function form<
  ChildBuilders extends Record<string, Builder>,
  Builder extends BasicBuilder<unknown, Model>,
  Model extends BasicModel<unknown>
>(childBuilders: ChildBuilders) {
  return new FormBuilder<ChildBuilders, Builder, Model>(childBuilders);
}
