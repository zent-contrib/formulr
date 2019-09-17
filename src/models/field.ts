import { BehaviorSubject } from 'rxjs';
import { BasicModel } from './basic';
import { Some, None, or, isSome, get } from '../maybe';

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

  valid() {
    return this.error$.getValue() === null;
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
    return this._touched;
  }
}

FieldModel.prototype[FIELD] = true;

function isFieldModel<T>(maybeModel: any): maybeModel is FieldModel<T> {
  return !!(maybeModel && maybeModel[FIELD]);
}

export { FieldModel, isFieldModel };
