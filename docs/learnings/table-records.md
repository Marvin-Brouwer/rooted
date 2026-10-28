# Table records

Components and tables don't mix well. Every rooted component sits inside a wrapper element (`<r-->` in production, `<rooted-component>` in dev, see [internals](../advanced/internals.md#the-component-wrapper)), and HTML is strict about what can go inside a `<table>`: a `<tbody>` takes `<tr>` elements, a `<tr>` takes `<td>` and `<th>`, and nothing else.

## What went wrong in five dice

When [five dice](https://github.com/Marvin-Brouwer/five-dice) was rebuilt in rooted ([#149](https://github.com/Marvin-Brouwer/rooted/issues/149)), its table rows ran into this. A row as a component ends up as `<tbody><r--><tr>...</tr></r--></tbody>`, and a cell as a component as `<tr><r--><td>...</td></r--></tr>`.

Built through the DOM API, that markup stays where you put it, and `display: contents` keeps the layout mostly intact. But it's still invalid, and it shows:

- Parsed as HTML, which is what happens to a pre-rendered page, the parser doesn't accept the wrapper there. It foster-parents it out, so the content lands before the table instead of in it.
- Assistive tech builds the table structure from the element tree. A wrapper between `<tbody>` and `<tr>` can break that, even with `role="none"` on it.
- Selectors like `tbody > tr` and `tr:nth-child(odd)` stop matching, because the row isn't a direct child of the body any more.

The way around it today is to keep the `<table>`, `<tr>` and `<td>` elements in one component and build the rows with `element()` instead of making each row its own component. That works, but a row can't have its own state, styles or lifecycle that way.

## What v2 should do about it

This is why v2 should support the `is="td"` pattern: a component that renders as the element itself instead of inside a wrapper, so a row component is a real `<tr>`. The web platform has this as [customized built-in elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#customized_built-in_elements) (`<tr is="score-row">`). The catch is that Safari doesn't implement those and has said it won't, so v2 needs either a polyfill or its own way of attaching a component to a plain element. See [components in v2](../ideas/v2/components.md).
