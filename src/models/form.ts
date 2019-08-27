import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { FieldSetModel } from './set';
import { BasicModel } from './basic';

export enum FormStrategy {
  Model,
  View,
}

export class FormModel<
  Children extends Record<string, BasicModel<any>> = Record<string, BasicModel<any>>
> extends FieldSetModel<Children> {
  /** @internal */
  private readonly workingValidators = new Set<Observable<unknown>>();
  readonly isValidating$ = new BehaviorSubject(false);
  readonly change$ = new Subject<void>();

  /** @internal */
  addWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.add(v);
    this.updateIsValidating();
  }

  /** @internal */
  removeWorkingValidator(v: Observable<unknown>) {
    this.workingValidators.delete(v);
    this.updateIsValidating();
  }

  /** @internal */
  private updateIsValidating() {
    const isValidating = this.workingValidators.size > 0;
    if (isValidating !== this.isValidating$.getValue()) {
      this.isValidating$.next(isValidating);
    }
  }
}
