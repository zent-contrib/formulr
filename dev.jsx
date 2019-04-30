import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

import { useForm, useField, FormStrategy, FormProvider, Validators, useFieldSet } from './src';

const Input = ({ name }) => {
  const [input, { error }] = useField(name, '', [Validators.required('required')]);
  const onChange = useCallback(
    e => {
      input.onChange(e.target.value);
    },
    [input.onChange],
  );
  return (
    <>
      <input {...input} onChange={onChange} style={{ color: error ? 'red' : undefined }} />
      {error ? error.message : null}
    </>
  );
};

const FieldSet = ({ name, children }) => {
  const [ctx] = useFieldSet(name);
  return <FormProvider value={ctx}>{children}</FormProvider>;
};

const App = () => {
  const form = useForm(FormStrategy.View);
  // const isValidating = useValue$(form.isValidating$, false);
  console.log('App render');
  return (
    <FormProvider value={form.ctx}>
      {Array(1000)
        .fill()
        .map((_, index) => (
          <Input key={index} name={`input${index}`} />
        ))}
      <FieldSet name="fieldset">
        <Input name="input1" />
        <Input name="input2" />
      </FieldSet>
    </FormProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));

// ReactDOM.unstable_createRoot(document.getElementById('app')).render(<App />);
