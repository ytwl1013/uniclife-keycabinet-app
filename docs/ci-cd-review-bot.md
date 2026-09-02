# CI/CD and Review Bot

This repository uses GitLab merge requests as the only path into the `dev`
integration branch.

## Branch Policy

- `main` remains the default protected branch.
- `dev` is the integration branch for implementation work.
- Direct pushes to `dev` are disabled.
- Merge requests targeting `dev` must pass GitLab CI before GitLab accepts a
  merge.
- The Codex review bot reviews non-draft merge requests targeting `dev` and
  merges the reviewed commit only when the review verdict is `pass`.

## Review Bot

The project webhook sends merge request events to the existing LAN review bot:

```text
http://192.168.50.18:8797/gitlab/webhook
```

The webhook secret and GitLab bot token are stored in the review bot runtime
environment, not in this repository.

The bot ignores draft merge requests and merge requests targeting branches other
than its configured target branches. It writes the review result back to the
merge request. If GitLab rejects the merge because CI is pending, CI failed, or
the branch cannot be merged, the merge request remains open for maintainers to
inspect.

## CI Pipeline

The current pipeline is intentionally small because this repository is still in
the initialization planning stage. The `repository_policy` job verifies:

- `AGENTS.md` and `README.md` exist.
- Secret-like files such as `.env`, private keys, and certificates are absent;
  environment-specific `*.example` templates containing placeholders are
  allowed.
- Obvious private key material is absent.
- Secret-like environment assignments are not committed.

When frontend, backend, shared contract, or integration test directories are
added, extend `.gitlab-ci.yml` with the relevant lint, type-check, test, build,
and contract validation jobs.

## Operational Check

Use GitLab project settings to confirm the live controls:

- `dev` branch exists and is protected.
- `dev` has direct push disabled.
- Project webhooks include merge request events for the review bot URL.
- Project setting "Pipelines must succeed" is enabled.

Do not commit production secrets, webhook secrets, GitLab tokens, device keys,
database passwords, cookies, or real `.env` files.
