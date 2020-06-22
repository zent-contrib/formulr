import { isArray } from './utils';

export function throwError(message: string, reason: string[] | string): never {
  throw new Error(
    `${message}.\n` +
      'The possible reason(s) for this error: ' +
      (isArray(reason) ? '\n' + reason.map((it, index) => `    ${index + 1}. ${it}`).join(';\n') + ';' : reason + '.') +
      '\n',
  );
}

export function unexpectedFormStrategy(): never {
  throwError('Unexpected FormStrategy', 'The first argument to form hooks is string in a model-driven form context');
}
