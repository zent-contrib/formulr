import { BehaviorSubject, Subject } from 'rxjs';
import { BasicModel } from './basic';
import { ValidateOption } from '../validate';

class FieldModel<Value> extends BasicModel<Value> {
  /**
   * @internal
   */
  isFieldModel!: boolean;

  readonly value$: BehaviorSubject<Value>;
  /** @internal */
  _touched = false;
  /** @internal */
  change$ = new Subject();

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

  validate(option = ValidateOption.Default) {
    this.validate$.next(option);
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

FieldModel.prototype.isFieldModel = true;

function isFieldModel<T>(maybeModel: any): maybeModel is FieldModel<T> {
  return !!maybeModel.isFieldModel;
}

export { FieldModel, isFieldModel };
