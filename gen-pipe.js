let value = '';

for (let i = 3; i < 10; i += 1) {
  const generics = Array(i).fill(null).map((_, i) => `T${[i]}`).join(', ');
  const args = Array(i - 1).fill(null).map((_, i) => `fn${i}: (t${i}: T${i}) => T${i + 1}`).join(', ');
  value += `export function usePipe<${generics}>(${args}): (t0: T0) => T${i - 1};
`;
}

console.log(value);