<!-- Please refer to your issue number here, if applicable: -->
# Pull request for: <!--Issue number-->

<!-- Summary here
     Have a look at: https://github.blog/2015-01-21-how-to-write-the-perfect-pull-request/ -->

## Definition Of Done  

<!-- Please do not forget to check these tasks:
     You can check them if not applicable. -->

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
