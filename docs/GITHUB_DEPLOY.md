# GitHub Actions — Deploy SSH

Production deploy runs via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) on push to `main` or manual `workflow_dispatch`.

## Deploy credentials (versioned files)

In this private repository, commit deploy credentials under [`.github/deploy/`](../.github/deploy/):

| File | Description |
|------|-------------|
| [`deploy.env`](../.github/deploy/deploy.env) | `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_PATH` (`KEY=VALUE` lines). |
| [`deploy_key`](../.github/deploy/deploy_key) | Private key for SSH authentication (full PEM, including `-----BEGIN ... KEY-----` lines). |

| Variable | Description |
|----------|-------------|
| `DEPLOY_HOST` | Hostname or IP of the production server. |
| `DEPLOY_USER` | SSH user on the production server. |
| `DEPLOY_PATH` | Absolute path to the git clone on the server (repo root containing `docker-compose.yml`; where `docker compose` runs). |

The workflow checks out the repository and reads these files before connecting. If any value is missing, the **Configure SSH** step fails early with a message listing what is missing instead of an opaque `ssh-keyscan` error.

See [DEPLOY_SECRETS.example](DEPLOY_SECRETS.example) for placeholder values.

## Optional repository secrets (overrides)

You may still set GitHub Actions secrets to override the committed files (useful for rotation without a commit):

| Secret | Overrides |
|--------|-----------|
| `SSH_PRIVATE_KEY` | `.github/deploy/deploy_key` |
| `DEPLOY_HOST` | `DEPLOY_HOST` in `deploy.env` |
| `DEPLOY_USER` | `DEPLOY_USER` in `deploy.env` |
| `DEPLOY_PATH` | `DEPLOY_PATH` in `deploy.env` |

```bash
gh secret set SSH_PRIVATE_KEY --body "$(cat .github/deploy/deploy_key)"
gh secret set DEPLOY_HOST --body "$(grep '^DEPLOY_HOST=' .github/deploy/deploy.env | cut -d= -f2-)"
gh secret set DEPLOY_USER --body "$(grep '^DEPLOY_USER=' .github/deploy/deploy.env | cut -d= -f2-)"
gh secret set DEPLOY_PATH --body "$(grep '^DEPLOY_PATH=' .github/deploy/deploy.env | cut -d= -f2-)"
```

## Server setup

On the production host, before the first workflow run:

1. Clone this repository to an **absolute** path (for example `/home/deploy/opengym`). That directory is `DEPLOY_PATH` — it must contain `docker-compose.yml` and be a git checkout with a configured remote (`git pull` runs there).
2. Install the **public** key that matches the deploy private key into `~/.ssh/authorized_keys` for `DEPLOY_USER`:

```bash
# Local: derive public key from the same private key committed in .github/deploy/deploy_key
ssh-keygen -y -f .github/deploy/deploy_key

# On the server (as DEPLOY_USER)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPLACEHOLDER_PUBLIC_KEY deploy@example" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Verify

1. Replace placeholders in `.github/deploy/deploy.env` and `.github/deploy/deploy_key` with production values and push to `main`.
2. Run the workflow manually: **Actions → Deploy → Run workflow**.
3. Confirm **Configure SSH** completes and **Pull and rebuild web** runs `git pull` and `docker compose up -d --build web` on the remote host.

On-host updates without GitHub Actions are documented in [MANUAL_DE_OPERACAO.md](MANUAL_DE_OPERACAO.md) (`scripts/deploy.sh`).
