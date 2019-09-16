import { BehaviorSubject } from 'rxjs';
import { BasicModel } from './basic';

const FIELD = Symbol('field');

class FieldModel<Value> extends BasicModel<Value> {
  /**
   * @internal
   */
  [FIELD]!: boolean;

  readonly value$: BehaviorSubject<Value>;
  /** @internal */
  _touched = false;

  isCompositing = false;

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
    this.value$.next(this.initialValue === undefined ? this.defaultValue : this.initialValue);
  }

  clear() {
    this.initialValue = undefined;
    this.value$.next(this.defaultValue);
  }

  initialize(value: Value) {
    this.initialValue = value;
    this.value$.next(value);
  }

  getRawValue() {
    return this.value$.getValue();
  }

  valid() {
    return this.error$.getValue() === null;
  }

  patchValue(value: Value) {
    this.value$.next(value);
  }

  pristine() {
    const value = this.value$.getValue();
    if (this.initialValue !== undefined) {
      return value === this.initialValue;
    }
    return value === this.defaultValue;
  }

  dirty() {
    return !this.pristine();
  }

  touched() {
    return this._touched;
  }
}

FieldModel.prototype[FIELD] = true;

function isFieldModel<T>(maybeModel: any): maybeModel is FieldModel<T> {
  return !!(maybeModel && maybeModel[FIELD]);
}

export { FieldModel, isFieldModel };
