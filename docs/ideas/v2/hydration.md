# Hydration in v2

How a v2 page goes from server-rendered HTML to a running app, as worked out in a design conversation between September 30 and October 28, 2026. This is where the conversation landed, not a spec. Nothing's built, and the [open questions](#open-questions) at the end are real.

## Where v1 is

`@rooted/prerender` renders each static route in happy-dom at build time. In the browser the app mounts from scratch and replaces that markup ([#407](https://github.com/Marvin-Brouwer/rooted/issues/407) shows what that relies on). That's destructive hydration, what Angular Universal did before v16. It's simple, but it costs:

- Anything the user did before the JS ran: typed input, focus, caret, an open `<details>`, scroll inside a container.
- Media and embeds: `<video>` and `<audio>` restart, `<iframe>`s reload.
- LCP: the replaced hero is a new element, so the metric moves to when the JS finished. Replaced images can flicker.
- Screen readers lose their place, and third-party scripts and extensions hold references to nodes that are gone.
- It's more DOM work than hydrating, not less. Both have to download and run the component code, and replacing then builds every node again.

## Principles it has to fit

- **Not reactive.** Nothing re-renders on its own. Changes after load are plain DOM operations on references the component holds, so hydration only matters on the initial load.
- **`mount` runs on both sides.** On the server it builds the HTML. In the browser it runs again as the hydration step, and `on('mounted')` is where browser-only code goes. Users don't need to know that `mount` is an HTML builder.
- **Developers don't pay for the framework's limits.** `environment.is('client')` can go anywhere in `mount`, ternaries included. Where that makes server and client differ, the framework deals with it.
- **No framework markup.** The only marker in the HTML is a standard `id`.

## The mechanism

### 1. IDs are the only marker

An element that needs to survive hydration gets a real `id` attribute. Developers get one from an `id()` helper, and the build adds one where it's needed (see 2 and 3).

- `id('email')` gives `` `${hostId}-email` ``: the id of the component's host plus a name. The server derives the host id from its position in the tree and writes it into the HTML, and the browser reads it back, so both sides get the same value no matter what order things run in. A component that only exists on the client gets a random host id, since there's nothing to match.
- The v2 element proxy only accepts the branded type `id()` returns, not a plain string, so hand-written ids can't collide with the scheme. Raw HTML (markdown, WYSIWYG content, `innerHTML`) can still carry ids, but those are never claimed.
- The id scheme lives behind one function, shared by `id()`, the server render and the client claim.
- The component's type number currently comes from the bundle filename in the stack trace. That works because the server runs the same bundle as the client. If that ever changes, a Vite plugin can inject a constant instead, and only that one function changes.

### 2. The build marks what's referenced

A Vite transform wraps every variable initializer in a component file:

```typescript
// source
const saveButton = button({
	label: 'Save',
})

// after the transform
const saveButton = __rootedRef(button({
	label: 'Save',
}), 'a3f9:12')
```

At runtime, `__rootedRef` checks whether the value is an element or component proxy. If it is, it gets an id from the call site plus an occurrence index (for loops), and if it isn't, it's returned untouched. The AST doesn't have to know what a builder call is, so imported components and helper functions work too.

- Over-marking is harmless. An element in a variable that's only used as a child gets an id it didn't need, and that's it.
- Plain assignments (`x = button()`) are covered too. Arrays and destructuring are marked one level deep.
- The transform only runs on files that import from rooted.
- An element with a listener or a dynamic prop in its builder options is marked at runtime, without the transform.

### 3. The build marks dynamic child positions

Every child expression that isn't a plain builder call gets wrapped as well: ternaries, `&&` and `??`, function calls, `.map()`, spreads.

```typescript
// source
div({
	children: [
		environment.is('client') ? a() : b(),
	],
})

// after the transform
div({
	children: [
		__rootedDynamic(environment.is('client') ? a() : b(), 'c71e:4'),
	],
})
```

`__rootedDynamic` gives the elements it returns an id, like `__rootedRef`, and flags them. A builder that receives a flagged child marks itself as referenced. So every parent of a conditional or a list is live on the client, and the transform doesn't need to work out which call is the parent.

### 4. In the browser

1. **`mount` runs inertly.** Builder calls don't create DOM, they only describe. A referenced element is looked up with `getElementById` and comes back as the wrapper around the live node. Putting a live node into an inert parent does nothing, so nothing moves.
2. **Referenced elements get their attributes and text patched.** That covers `label: environment.is('client') ? 'Ready' : 'Loading'`, where the structure matches but the server HTML has the other value.
3. **A removal pass** runs under each host, before `mounted`. Any element with a generated id that wasn't looked up existed only on the server, and gets removed. It only touches ids from rooted's own scheme, and stops at nested rooted components, which run their own pass.
4. **Client-only elements in a dynamic position** have no server node. Their parent is live (see 3), so it gets `replaceChildren`, reusing its claimed children by id.
5. **`on('mounted')` fires.** Client-only code that does `container.append(element)` is a normal DOM operation on a live reference, so there's nothing for the framework to do.
6. **After that it's plain DOM.** The developer holds references and changes them directly.

### 5. When it goes wrong anyway

If an id the body expects isn't in the page (stale HTML from a cache, a hand-edited page), the component is rebuilt from scratch and a warning goes to the console in dev. That's the last resort, not a normal path. The conversation suggested a morph library like idiomorph for this rebuild, so media and focus usually survive even then.

## Around it

### Data-driven views

Filters, sorting and paging belong in the URL. The server renders the default view or a skeleton, and the client fetches and renders the filtered result.

- Don't rebuild when the URL matches what the server rendered, or every plain visit shows content, throws it away and renders it again.
- Don't hydrate a region the client is about to replace anyway.
- Give skeletons a fixed size or an `aspect-ratio`, so the real content doesn't shift the layout.

Clearing and rebuilding a list is fine here. The controls sit outside the list, and the items are fresh data with nothing to preserve.

### HTML the parser won't change

The browser's parser rewrites some markup: a `<table>` without `<tbody>`, block elements inside `<p>`, nested `<a>`, custom elements inside tables. The server output has to avoid that, and the build is the place to check it. It's also why table rows need the `is=` approach in the [component model](./component-model.md).

### Testing

One Playwright fixture across Chromium, Firefox and WebKit, with:

- A component with an `environment.is('client')` ternary.
- A `.map()` list.
- A component used twice, and two components in the same chunk.
- A stateful input.
- A `<tr is="...">` row.

It asserts that every id is claimed, nothing is left over, and references point at live nodes. That's also the test that catches the stack-trace id scheme breaking.

## What was ruled out

- **Destructive replace**, with or without disabling the page until load. Replacing loses the state above. Disabling everything leaves a dead page without JS, and disabled elements aren't focusable. A state-transfer pass (copying values, focus, scroll) would fix part of it, but not media or iframes.
- **Positional paths** (a `key → [1, 0, 2]` map). They break when anything is inserted before hydration, extensions included, and they're only valid once.
- **Framework markers in the HTML.** `data-rooted-ref` takes a `data-*` name, `rooted:ref` fails the W3C validator, and comment markers felt like a hack. The XHTML, `nonce`, `itemref` and `<r-ref>` marker ideas each broke something worse. Standard ids made all of it unnecessary.
- **Morphing a detached tree.** User code holds references to the new nodes, while the morph keeps the old ones, so the references end up pointing at nodes that never reach the page.
- **An existing library** (Mithril, lit-html, Preact, morphdom). They solve ongoing updates, which v2 doesn't want, and they bring their own rendering model. The claim step is a small amount of code without them.
- **A JSON tree as the client-side description.** It works, but it's a short-lived virtual DOM, and the id approach doesn't need one.
- **Dry-running `on('mounted')` on the server** to find references. It misses nested callbacks, branches and async code.

## Open questions

- **Is there a `render()` after load?** The conversation went back and forth. It landed on "no updates, plain DOM after hydration", and the [plan](./plan.md) still lists "one `render` that diffs". If it comes back, the idea on the table was: referenced nodes reused by id, unreferenced nodes diffed by position, foreign nodes skipped, and listeners from a render tied to a per-render `AbortController`. A keyed list helper is the smaller alternative, if real apps turn out to need it.
- **Strip generated ids after claiming?** They have side effects: `window[id]`, `:target` on a matching URL fragment, named access on forms. Stripping the build-added ones avoids those, but keeping them gives stable hooks. Developer ids from `id()` always stay.
- **Server render without happy-dom.** If `mount` builds a description on the server rather than DOM, happy-dom can go, and a DOM call in `mount` fails at build time instead of silently producing something different. How that fits [#378](https://github.com/Marvin-Brouwer/rooted/issues/378) is open.
- **Streaming.** How a generator `mount` combines with claiming, and what it does under SSG. See the [component sketches](./components.md#open-questions).
- **Verify the stack-trace id scheme** in a production build: two components in one chunk, and the stack formats of Firefox and Safari.
