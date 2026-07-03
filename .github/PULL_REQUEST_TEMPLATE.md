<!-- Keep it short. See CONTRIBUTING.md. -->

## What & why
<!-- What does this change and why. Link any issue. -->

## How tested
<!-- Commands run + what you observed. For UI, add before/after screenshots. -->
- [ ] Backend `tsc` clean + `npm test` green
- [ ] Frontend `tsc` clean + tests green
- [ ] Schema change → `npm run verify:fresh-db` passed (or N/A)
- [ ] Exercised the actual flow (not just tests)

## Checklist
- [ ] Branched off `master`; conventional-commit messages
- [ ] New endpoint? auth-guarded / farm-scoped / DTO-validated (see CONTRIBUTING §5)
- [ ] User-facing strings added to **all 6 languages**
- [ ] Docs updated if behavior changed

## Deploy notes
<!-- Does this need a Render deploy (backend) or an EAS update/build (frontend)? Migrations to run? See docs/OPERATIONS.md -->
