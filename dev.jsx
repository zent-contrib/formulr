import React, { Component, createRef } from 'react';
import ReactDOM from 'react-dom';

import { Form, Field, FieldSet, FieldArray } from './src';

const onInputChange = e => e.target.value;

const InputField = ({ name, defaultValue = '' }) => (
  <Field name={name} defaultValue={defaultValue} typeKey={String} onChange={onInputChange}>
    {({ onChange, value, onBlur, onCompositionEnd, onCompositionStart, onFocus }) => (
      <input value={value} onChange={onChange} onBlur={onBlur} onCompositionEnd={onCompositionEnd} onCompositionStart={onCompositionStart} onFocus={onFocus} />
    )}
  </Field>
);

class App extends Component {
  constructor(props) {
    super(props);
    this.formRef = createRef();
    this.arrayRef = createRef();
    this.onClick = () => {
      const form = this.formRef.current;
      console.log(form.getValue());
    };
    this.onPush = () => {
      const arr = this.arrayRef.current;
      const model = arr.getModel();
      const keys = model.keys;
      model.keys = [...keys, '' + keys.length];
    };
    this.toggle1 = () => {
      this.setState(state => ({
        toggle1: !state.toggle1,
      }));
    };
    this.state = {
      toggle1: true,
    };
  }

  render() {
    const { toggle1 } = this.state;
    return (
      <>
        <Form ref={this.formRef}>
          {toggle1 && <InputField name="input" />}
          <FieldSet name="fieldset">
            {() => (
              <>
                <InputField name="input2" />
                <InputField name="input3" />
              </>
            )}
          </FieldSet>
          <FieldArray ref={this.arrayRef} name="fieldarray">
            {({ keys }) => keys.map(key => <InputField key={key} name={key} />)}
          </FieldArray>
        </Form>
        <button onClick={this.onClick}>values</button>
        <button onClick={this.onPush}>push</button>
        <button onClick={this.toggle1}>toggle 1</button>
      </>
    );
  }
}

ReactDOM.unstable_createRoot(document.getElementById('app')).render(<App />);
