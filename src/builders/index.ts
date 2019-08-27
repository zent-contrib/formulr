import { FieldArrayBuilder } from './array';
import { FieldBuilder } from './field';
import { FieldSetBuilder } from './set';
import { BasicBuilder } from './basic';
import { FormBuilder } from './form';

export * from './array';
export * from './field';
export * from './set';
export * from './form';

export function field<T>(defaultValue: T) {
  return new FieldBuilder(defaultValue);
}

export function array<ChildBuilder extends BasicBuilder<any, any>>(
  childBuilder: ChildBuilder,
) {
  return new FieldArrayBuilder<ChildBuilder>(childBuilder);
}

export function set<ChildBuilders extends Record<string, BasicBuilder<any, any>>>(childBuilders: ChildBuilders) {
  return new FieldSetBuilder<ChildBuilders>(childBuilders);
}

export function form<ChildBuilders extends Record<string, BasicBuilder<any, any>>>(childBuilders: ChildBuilders) {
  return new FormBuilder<ChildBuilders>(childBuilders);
}
