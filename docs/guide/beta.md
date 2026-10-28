# Beta program

Rooted is in open beta. Every `@rooted/*` and `@rooted-adapters/*` package is ready to build on, but the API can still change before 1.0. This page is for people who want to try it anyway: what you can count on, how to install it, and how your feedback gets back into the framework.

## What beta means here

- **Things can still break.** The point of the beta is to find out what doesn't work for real projects while there's still room to change it. If feedback shows that something needs a redesign, it gets redesigned, and that happens early in the beta rather than late.
- **Breaking changes are announced.** Each one shows up in the release notes on GitHub, with what to change in your code.
- **Version ranges don't protect you.** In a prerelease, `^1.0.0-beta.3` happily installs `1.0.0-beta.9`, breaking changes and all. Pin exact versions and update on purpose.
- **Only the latest beta gets fixes**, security fixes included. There are no backports to older betas.
- **It's a hobby project.** Rooted is built and maintained by one person in their spare time. There's no promised response time on issues or questions. Silence usually means busy, not ignored.

## Installing

Install from the `beta` dist-tag:

```sh
pnpm add @rooted/components@beta
```

A plain `pnpm add @rooted/components` installs an old alpha from the `latest` tag, which doesn't match these docs. Those old versions are deprecated and warn about it, but it's easy to miss.

The packages version independently, so `@rooted/router` can be on a different beta number than `@rooted/components`. Install and update them together with `@beta` and they'll fit.

To pin exact versions with pnpm:

```sh
pnpm add --save-exact @rooted/components@beta @rooted/router@beta
```

### Requirements

| Tool | Version |
|------|---------|
| Node | 22 or newer |
| Vite | 8.0.1 or newer |
| Browsers | Current versions of Chrome, Edge, Firefox and Safari |

Nothing is tested against older browsers yet. If you need one, say so in the feedback.

## Updating

Before you update, read the [releases on GitHub](https://github.com/Marvin-Brouwer/rooted/releases) for the packages you use. Breaking changes are listed there with a migration note. Then bump all `@rooted/*` packages at once.

## Giving feedback

Feedback is the whole reason for the beta, and the most useful kind is an honest account of building something real.

| What you have | Where it goes |
|---|---|
| An experience report: what you built, where it hurt | [Discussions, Beta feedback](https://github.com/Marvin-Brouwer/rooted/discussions/categories/beta-feedback) |
| A "how do I..." question | [Discussions, Q&A](https://github.com/Marvin-Brouwer/rooted/discussions/categories/q-a) |
| Something you built and want to show | [Discussions, Show and tell](https://github.com/Marvin-Brouwer/rooted/discussions/categories/show-and-tell) |
| A bug with steps to reproduce it | [Issues](https://github.com/Marvin-Brouwer/rooted/issues/new/choose) |
| A security problem | [Private security advisory](https://github.com/Marvin-Brouwer/rooted/security/advisories/new), never a public issue |

### The four questions

If you write an experience report, these four answers are what helps most:

1. What did you build, or try to build? Link it if it's public.
2. Where did you get stuck, and for how long?
3. Which API did something you didn't expect?
4. What did you have to write yourself that you think belongs in rooted?

Question 3 decides what changes before the API freezes. Question 4 decides what's missing for 1.0.

### Reporting a bug

Include the package name and exact version, your Node version and browser, and the smallest reproduction you can manage: a small repository or a StackBlitz link beats a description. Bugs without a way to reproduce them are hard to fix and may be closed after a while.

## Help each other

With one maintainer, the fastest answer to a question is usually another user. If you see a question in Q&A that you can answer, please do. Good answers get marked as accepted, and recurring questions end up in the [FAQ](./faq.md) or the guides.

If you'd like to fix something yourself, the [contribution guide](https://github.com/Marvin-Brouwer/rooted/blob/main/CONTRIBUTING.md) explains how the repo works.

## When it ends

The beta ends with 1.0 when the exit criteria are met, not on a date: enough real-world use, an API that's been stable for a while, and no open blockers on the [V1 milestone](https://github.com/Marvin-Brouwer/rooted/milestones). From 1.0 on, normal semver applies, and removals go through a deprecation first.
