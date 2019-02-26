import * as React from 'react';
import { Component } from 'react';
import { IFormFieldChildProps } from './shared';
import FormContext from './context';

export interface IFormFieldSetProps {
    name: string;
}

export class FieldSet extends React.Component<IFormFieldSetProps> {
    static contextType = FormContext;
}
