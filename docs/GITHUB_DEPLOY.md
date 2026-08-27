# GitHub Actions — Deploy SSH

Production deploy runs via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) on push to `main` or manual `workflow_dispatch`.

## Required repository secrets

Configure these at **Settings → Secrets and variables → Actions** (never commit values to the repo):

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Private key for SSH authentication to the production host (PEM format, including `-----BEGIN ... KEY-----` lines). |
| `DEPLOY_HOST` | Hostname or IP of the production server. |
| `DEPLOY_USER` | SSH user on the production server. |
| `DEPLOY_PATH` | Absolute path to the git clone on the server (repo root containing `docker-compose.yml`; where `docker compose` runs). |

If any secret is missing, the **Configure SSH** step fails early with a message listing the missing names instead of an opaque `ssh-keyscan` error.

## Set secrets (GitHub CLI)

From a clone of this repository (requires `gh auth login`):

```bash
gh secret set SSH_PRIVATE_KEY --body "$(cat <<'EOF'
-----BEGIN OPENSSH PRIVATE KEY-----
PLACEHOLDER_BASE64_KEY_BODY_DO_NOT_USE_REAL_VALUE
-----END OPENSSH PRIVATE KEY-----
EOF
)"
gh secret set DEPLOY_HOST --body "203.0.113.10"
gh secret set DEPLOY_USER --body "deploy"
gh secret set DEPLOY_PATH --body "/home/deploy/opengym"
```

`SSH_PRIVATE_KEY` must be the full PEM block, including the `-----BEGIN ... KEY-----` and `-----END ... KEY-----` lines. Do not paste only the base64 middle section.

See [DEPLOY_SECRETS.example](DEPLOY_SECRETS.example) for placeholder values only.

## Server setup

On the production host, before the first workflow run:

1. Clone this repository to an **absolute** path (for example `/home/deploy/opengym`). That directory is `DEPLOY_PATH` — it must contain `docker-compose.yml` and be a git checkout with a configured remote (`git pull` runs there).
2. Install the **public** key that matches `SSH_PRIVATE_KEY` into `~/.ssh/authorized_keys` for `DEPLOY_USER`:

```bash
# Local: derive public key from the same private key you will store in GitHub
ssh-keygen -y -f /path/to/deploy_private_key

# On the server (as DEPLOY_USER)
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPLACEHOLDER_PUBLIC_KEY deploy@example" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Verify

1. Ensure all four secrets are set in the repository.
2. Run the workflow manually: **Actions → Deploy → Run workflow**.
3. Confirm **Configure SSH** completes and **Pull and rebuild web** runs `git pull` and `docker compose up -d --build web` on the remote host.

On-host updates without GitHub Actions are documented in [MANUAL_DE_OPERACAO.md](MANUAL_DE_OPERACAO.md) (`scripts/deploy.sh`).
