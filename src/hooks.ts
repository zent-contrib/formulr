import { useState, useEffect } from 'react';
import { Observable } from 'rxjs';
import { BasicModel } from './models';

export function useValue$<T>(value$: Observable<T>, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  useEffect$(value$, value => {
    setValue(value);
  });
  return value;
}

export function useEffect$<T>(event$: Observable<T>, effect: (e: T) => void) {
  useEffect(() => {
    const $ = event$.subscribe(effect);
    return () => $.unsubscribe();
  }, [event$]);
}

export function useVisible<T>(model: BasicModel<T>) {
  useEffect(() => {
    model.isVisible = true;
    return () => {
      model.isVisible = false;
      console.log(model.isVisible)
    };
  }, []);
}
