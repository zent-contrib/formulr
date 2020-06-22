import { isArray } from './utils';
import { FormStrategy } from './models';

export function throwError(message: string, reason: string[] | string): never {
  throw new Error(
    `${message}.\n` +
      'The possible reason(s) for this error: ' +
      (isArray(reason) ? '\n' + reason.map((it, index) => `    ${index + 1}. ${it}`).join(';\n') + ';' : reason + '.') +
      '\n',
  );
}

export function unexpectedFormStrategy(strategy: FormStrategy.Model): never {
  let reason: string;
  switch (strategy) {
    case FormStrategy.Model:
      reason = 'The first argument to form hooks is string in a model-driven form context';
      break;
    default:
      reason = `Unknown strategy (${strategy}) in "useForm". Expect \`FormStrategy.View\` or \`FormStrategy.Model\``;
  }
  throwError('Unexpected FormStrategy', reason);
}
