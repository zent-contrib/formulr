function Component1() {
  const { value, onChange } = useField('name');
  const field2 = useField('field2');
  const field3 = useField('field3');

  return <input value={value} onChange={e => onChange(e.target.value)} />;
}

function Component2({ model }) {
  const { value, onChange, error } = useField(model, {
    validator: values => {
      
    }
  });

  return <input value={value} onChange={e => onChange(e.target.value)} />;
}

function ArrayComponent() {
  const models = useFieldArray('name');
  return models.map(model => <Component2 model={model} />);
}

function FieldSets() {
  return <FieldSet name="name">...</FieldSet>;
}

function FieldSets({ model }) {
  return <FieldSet model={model}>...</FieldSet>;
}

function InputField() {
  <div>
    <label></label>
    <input></input>

  </div>
}

function App() {
  const form = useForm();
  return (
    <Form model={form}>
      <InputField
        name="input"
        required
        validation={[
          Validators.required,
          Validators.minLength(),
        ]}
        renderError={errors => {

        }}
      />
    </Form>
  );
}
