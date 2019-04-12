import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

import {
  useForm,
  useField,
  FormStrategy,
  FormProvider,
  Validators,
  useFieldSet,
} from './src';
// import { useValue$ } from './src/hooks';

const Input = ({ name }) => {
  const [input, { error }] = useField(name, '', [Validators.required('')]);
  const onChange = useCallback(
    e => {
      input.onChange(e.target.value);
    },
    [input.onChange],
  );
  return (
    <input
      {...input}
      onChange={onChange}
      style={{ color: error ? 'red' : undefined }}
    />
  );
};

const FieldSet = ({ name, children }) => {
  const [ctx] = useFieldSet(name);
  return <FormProvider value={ctx}>{children}</FormProvider>;
};

const App = () => {
  const [_, ctx, form] = useForm(FormStrategy.View);
  // const isValidating = useValue$(form.isValidating$, false);
  console.log('App render');
  return (
    <FormProvider value={ctx}>
      <Input name="input" />
      <FieldSet name="fieldset">
        <Input name="input1" />
        <Input name="input2" />
      </FieldSet>
    </FormProvider>
  );
};

ReactDOM.unstable_createRoot(document.getElementById('app')).render(<App />);
