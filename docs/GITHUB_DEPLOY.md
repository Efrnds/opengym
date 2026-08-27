# GitHub Actions — Deploy SSH

Production deploy runs via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) on push to `main` or manual `workflow_dispatch`.

## Required repository secrets

Configure these at **Settings → Secrets and variables → Actions** (never commit values to the repo):

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Private key for SSH authentication to the production host (PEM format, including `-----BEGIN ... KEY-----` lines). |
| `DEPLOY_HOST` | Hostname or IP of the production server. |
| `DEPLOY_USER` | SSH user on the production server. |
| `DEPLOY_PATH` | Absolute path to the openGym checkout on the server (where `docker compose` runs). |

If any secret is missing, the **Configure SSH** step fails early with a message listing the missing names instead of an opaque `ssh-keyscan` error.

## Verify

1. Ensure all four secrets are set in the repository.
2. Run the workflow manually: **Actions → Deploy → Run workflow**.
3. Confirm **Configure SSH** completes and **Pull and rebuild web** runs `git pull` and `docker compose up -d --build web` on the remote host.

On-host updates without GitHub Actions are documented in [MANUAL_DE_OPERACAO.md](MANUAL_DE_OPERACAO.md) (`scripts/deploy.sh`).
