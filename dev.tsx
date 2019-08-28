import * as React from 'react';
import { useCallback } from 'react';
import * as ReactDOM from 'react-dom';

import {
  useForm,
  useField,
  FormStrategy,
  FormProvider,
  Validators,
  useFieldSet,
  FieldValue,
  FieldSetValue,
  useFieldArray,
  ValidatorResult,
  ModelRef,
  FieldSetModel,
} from './src';

function asyncValidator(): ValidatorResult<string> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        name: 'async',
        message: 'async',
      });
    }, 100);
  });
}
asyncValidator.isAsync = true;

const List2 = () => {
  const [children] = useFieldArray<any, FieldSetModel>('list', [], ['123', '456']);
  return (
    <>
      {children.map((child, index) => (
        <Input key={index} field={child} />
      ))}
    </>
  );
};

const List = () => {
  const [children] = useFieldArray<any, FieldSetModel>('list', [], [{}, {}]);
  return (
    <div style={{ border: '1px solid red', padding: '10px' }}>
      {children.map((child, index) => (
        <FieldSet key={index} model={child}>
          <Input field="a" />
          <Input field="b" />
          <Input field="c" />
          <List2 />
        </FieldSet>
      ))}
    </div>
  );
};

const Input = ({ field }: { field: any }) => {
  const [input, { error }] = useField(field, '', [Validators.required('required'), asyncValidator]);
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

const NestedList1 = ({ model }: { model: any }) => {
  const [children] = useFieldArray<any, FieldSetModel>(model, [], [['123', '456'], ['654', '321']]);
  return (
    <>
      {children.map((child, index) => (
        <NestedList2 key={index} model={child} />
      ))}
    </>
  );
};

const NestedList2 = ({ model }: { model: any }) => {
  const [children] = useFieldArray<any, FieldSetModel>(model, [], ['123', '456']);
  return (
    <>
      {children.map((child, index) => (
        <Input key={index} field={child} />
      ))}
    </>
  );
};

const FieldSet = ({
  name,
  children,
  model,
}: {
  name?: string;
  children?: React.ReactNode;
  model?: ModelRef<any, any, any> | FieldSetModel;
}) => {
  const [ctx] = useFieldSet(name || model!);
  return <FormProvider value={ctx}>{children}</FormProvider>;
};

const App = () => {
  const form = useForm(FormStrategy.View);
  // const isValidating = useValue$(form.isValidating$, false);
  console.log('App render');
  return (
    <FormProvider value={form.ctx}>
      {/* {Array(1000)
        .fill()
        .map((_, index) => (
          <Input key={index} name={`input${index}`} />
        ))} */}
      <FieldSet name="fieldset">
        <Input field="input1" />
        <FieldValue name="input1" />
        <Input field="input2" />
      </FieldSet>
      <FieldSetValue name="fieldset">
        <FieldValue name="input1" />
      </FieldSetValue>
      <List />
      <NestedList1 model="nested-list" />
      <button onClick={() => console.log(form.model.getRawValue())}>button</button>
    </FormProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));

// ReactDOM.unstable_createRoot(document.getElementById('app')).render(<App />);
