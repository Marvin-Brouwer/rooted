# Todo

## 2. Fix router

Currently in the example <http://localhost:5173/example/1/subroute/*> resolves to the same route as <http://localhost:5173/example/1/subroute/>

Either make subroutes have exact:

```ts
export const PartialGate = ExampleGate.append.exact(SubRoute)`/subroute/`
```

Or perhaps add more declarative ways

```ts
export const ExampleGate = gate(Example)`/example/${token('id', Number)}/${exactChildren}`
export const PartialGate = ExampleGate.append(SubRoute)`/subroute/${wildcard}`
```

## 3. Props mapper for DOM property names

`create()` uses `Object.assign` to apply properties directly to DOM elements, which means
consumers must use DOM property names rather than HTML attribute names:

- `className` instead of `class`
- `htmlFor` instead of `for`
- `readOnly` instead of `readonly`
- etc.

Create a mapper that translates common HTML attribute names to their DOM property equivalents,
so that `create('div', { class: 'foo' })` works as expected, keep `readOnly` though.
