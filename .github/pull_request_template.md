<!-- 
	Please provide a short summary: what changed and why. 
	Three sentences is plenty.
  What the diff already shows doesn't belong here. 

	Please make sure you've read, and understood, these:
	- Contribution guide: ../CONTRIBUTING.md
	- PR guide: ../docs/contributing/pull-requests.md
-->

<!-- Pull request for ... -->

## Definition Of Done

<!-- Tick items that apply. Items that don't apply also get ticked.
     The list is for the reviewer's benefit, not for compliance.
     See: docs/contributing/pull-requests.md -->

- [ ] Meets acceptance criteria of story / Fixed bug
- [ ] Added new tests
- [ ] All tests pass (`pnpm test`)
- [ ] Checked regression
  - Build passes
  - Tests still pass
  - Linting still passes
  - Chunking still works as expected, \
    _all async components in `**/_routes.mts` should only load when the corresponding route is visited._
  - The example app still functions
- [ ] Updated documentation
  - TSDoc added/updated for any changed public APIs
  - Docs updated if behavior changed (files under `docs/`)
