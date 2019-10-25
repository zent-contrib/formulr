import { BehaviorSubject } from 'rxjs';
import { BasicModel } from './basic';
import { Some, None, or, isSome, get } from '../maybe';
import { ValidateOption } from '../validate';
import { id } from '../utils';

const FIELD = Symbol('field');

export interface INormalizeBeforeSubmit<A, B> {
  (a: A): B;
}

class FieldModel<Value> extends BasicModel<Value> {
  /**
   * @internal
   */
  [FIELD]!: boolean;

  readonly value$: BehaviorSubject<Value>;
  isTouched = false;

  isCompositing = false;
  normalizeBeforeSubmit: INormalizeBeforeSubmit<Value, any> = id;

  /** @internal */
  constructor(private readonly defaultValue: Value) {
    super();
    this.value$ = new BehaviorSubject(defaultValue);
  }

  get value() {
    return this.value$.getValue();
  }

  set value(value: Value) {
    this.value$.next(value);
  }

  reset() {
    this.value$.next(or(this.initialValue, this.defaultValue));
  }

  clear() {
    this.initialValue = None();
    this.value$.next(this.defaultValue);
  }

  initialize(value: Value) {
    this.initialValue = Some(value);
    this.value$.next(value);
  }

  getRawValue() {
    return this.value$.getValue();
  }

  getSubmitValue() {
    const { normalizeBeforeSubmit } = this;
    return normalizeBeforeSubmit(this.value$.getValue());
  }

  valid() {
    return this.error$.getValue() === null;
  }

  validate(option = ValidateOption.Default) {
    return this.triggerValidate(option);
  }

  patchValue(value: Value) {
    this.value$.next(value);
  }

  pristine() {
    const value = this.value$.getValue();
    if (isSome(this.initialValue)) {
      return value === get(this.initialValue);
    }
    return value === this.defaultValue;
  }

  dirty() {
    return !this.pristine();
  }

  touched() {
    return this.isTouched;
  }
}

FieldModel.prototype[FIELD] = true;

function isFieldModel<T>(maybeModel: any): maybeModel is FieldModel<T> {
  return !!(maybeModel && maybeModel[FIELD]);
}

export { FieldModel, isFieldModel };
