import { useState, useEffect } from 'react';
import { Observable } from 'rxjs';

export function useSubscription<T>(value$: Observable<T>, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    const $value = value$.subscribe(value => {
      setValue(value);
    });
    return () => {
      $value.unsubscribe();
    };
  }, [value$]);
  return value;
}
