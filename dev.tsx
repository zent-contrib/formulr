/* eslint-disable */

import * as React from 'react';
import { useCallback, useEffect } from 'react';
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
  ModelRef,
  FieldSetModel,
  ValidateOption,
  createAsyncValidator,
  form,
  field,
  set,
  array,
  ValidatorMiddlewares,
  FieldArrayModel,
} from './src';

const asyncValidator = createAsyncValidator(() => {
  return new Promise((resolve, reject) => {
    // reject('111')
    setTimeout(() => {
      resolve({
        name: 'async',
        message: 'async',
      });
    }, 100);
  });
});

const List2 = () => {
  const { children } = useFieldArray<any, FieldSetModel>('list', [], ['123', '456']);
  return (
    <>
      {children.map((child, index) => (
        <Input key={index} field={child} />
      ))}
    </>
  );
};

const List = () => {
  const { children } = useFieldArray<any, FieldSetModel>('list', [], [{}, {}]);
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

const Input = ({ field }: { field: any; validators?: any[] }) => {
  const model = useField(field, '', [Validators.required('required'), asyncValidator]);
  const { error } = model;
  const onChange = useCallback(
    e => {
      model.value = e.target.value;
      model.validate(ValidateOption.Default | ValidateOption.IncludeAsync).then(
        result => {
          console.log('complete', result);
        },
        error => {
          console.log('throws error', error);
        },
      );
    },
    [model],
  );
  useEffect(() => {
    const $ = model.validate$.subscribe(() => {
      console.log('validate', field);
    });
    return () => $.unsubscribe();
  }, [model, field]);
  return (
    <div style={{ background: '#eee', padding: '10px' }}>
      <input value={model.value} onChange={onChange} style={{ color: error ? 'red' : undefined }} />
      {error ? error.message : null}
    </div>
  );
};

const Input2 = ({ name, validators, destroyOnUnmount }: any) => {
  const model = useField(name, '', validators);
  model.destroyOnUnmount = !!destroyOnUnmount;
  const onChange = useCallback(
    e => {
      model.value = e.target.value;
    },
    [model],
  );
  return (
    <div style={{ background: '#eee', padding: '10px' }}>
      <label>{name}: </label>
      <input value={model.value} onChange={onChange} />
    </div>
  );
};

const NestedList1 = ({ model: maybeModel }: { model: any }) => {
  const model = useFieldArray<any, FieldSetModel>(
    maybeModel,
    [],
    [
      ['123', '456'],
      ['654', '321'],
    ],
  );
  return (
    <>
      {model.children.map((child, index) => (
        <NestedList2 key={index} model={child} />
      ))}
    </>
  );
};

const NestedList2 = ({ model }: { model: any }) => {
  const { children } = useFieldArray<any, FieldSetModel>(model, [], ['123', '456']);
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

function FieldArray({ name, children }: any) {
  const model = useFieldArray(name, undefined, [{}]);
  return <>{children(model)}</>;
}

const App = () => {
  const form = useForm(FormStrategy.View);
  const [_, __] = React.useState(false);
  // const isValidating = useValue$(form.isValidating$, false);

  return (
    <FormProvider value={form.ctx}>
      <FieldArray name="array">
        {(model: FieldArrayModel<any, any>) => {
          return model.children.map((it, index) => {
            return (
              <FieldSet key={it.getModel()?.id || index} model={it}>
                <Input2 name="input1" />
                <FieldValue name="input1">
                  {input1 => {
                    return input1 !== null ? <Input2 destroyOnUnmount name="input2" /> : null;
                  }}
                </FieldValue>
              </FieldSet>
            );
          });
        }}
      </FieldArray>
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
        <FieldValue name="input2" />
      </FieldSetValue>
      <List />
      <NestedList1 model="nested-list" />
      <div>
        <button onClick={() => __(_ => !_)}>re-render</button>
        <button onClick={() => console.log(form.model.getRawValue())}>button</button>
        <button
          onClick={() =>
            form.model
              .validate(ValidateOption.IncludeUntouched | ValidateOption.IncludeChildrenRecursively)
              .then(result => {
                console.log('form validation complete', result);
              })
          }
        >
          validate
        </button>
        <button
          onClick={() =>
            form.model
              .validate(
                ValidateOption.IncludeUntouched |
                  ValidateOption.IncludeChildrenRecursively |
                  ValidateOption.IncludeAsync,
              )
              .then(result => {
                console.log('form validation complete', result);
              })
          }
        >
          validate including async
        </button>
      </div>
    </FormProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));

// ReactDOM.unstable_createRoot(document.getElementById('app')).render(<App />);

function typeTest() {
  const a = form({
    foo: field(''),
    bar: field(3),
    baz: set({
      foo: field(''),
      bar: field(3),
      baz: set({
        foo: field(''),
        bar: field(3),
      }),
    }),
    array: array(
      set({
        foo: field(''),
        bar: field(3),
        baz: set({
          foo: field(''),
          bar: field(3),
        }),
      }),
    ),
  });

  const b = a.build();

  const c: string | undefined = b.get('array')?.children[0]?.get('foo')?.value;
  const d = b.getRawValue();
  const e: number = d.array[0].baz.bar;

  void c;
  void e;
}

void typeTest;
