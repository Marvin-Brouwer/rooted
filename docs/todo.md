# Todo

## 3. Props mapper for DOM property names

`create()` uses `Object.assign` to apply properties directly to DOM elements, which means
consumers must use DOM property names rather than HTML attribute names:

- `className` instead of `class`
- `htmlFor` instead of `for`
- `readOnly` instead of `readonly`
- etc.

Create a mapper that translates common HTML attribute names to their DOM property equivalents,
so that `create('div', { class: 'foo' })` works as expected.
