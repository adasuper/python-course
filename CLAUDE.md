# Notes for Claude Code

Codeweald is a browser RPG that teaches Python to grades 6–8. Start with
[README.md](README.md) and [PROGRESS.md](PROGRESS.md). The design is in [docs/](docs).

## Branches: work on `dev`, never on `main`

- **`dev` is where all Claude Code work goes.** Start from the latest `origin/dev`, commit
  there, and push with `git push -u origin dev`. This is the maintainer's standing
  instruction. It also applies when a session was set up with another branch name (such as
  `claude/...`): use `dev` instead.
- **`main` is the live site.** Never push to `main`, merge into it, or open a pull request
  to it unless the maintainer asks for that in the conversation. The maintainer opens and
  merges the `dev` → `main` pull request by hand.
- Every push to `main` (that is, every merged pull request) runs the CI/CD pipeline and
  deploys the tested build to GitHub Pages (`.github/workflows/ci-cd.yml`).

## Before pushing

```bash
npm run lint && npm run format:check && npm run typecheck && npm test
npm run validate-content     # after editing content/
npm run solutions            # after changing a solution: regenerates docs/solutions.md
npm run build && npm run test:e2e   # after UI, game or runtime changes
```

Keep PROGRESS.md up to date when a milestone is done or a known issue changes.
