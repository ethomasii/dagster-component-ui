# Dagster Component UI

Web UI to browse Dagster component templates from
[`dagster-component-templates`](https://github.com/eric-thomas-dagster/dagster-component-templates)
(`manifest.json`, README, schema, examples).

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Output: `dist/` (not committed; CI and hosts build from source).

## Deploy (e.g. Vercel)

- **Framework:** Vite  
- **Build command:** `npm run build`  
- **Output directory:** `dist`  

`vercel.json` includes SPA rewrites for client-side routing.

## Catalog data

The app loads `public/manifest.json` (and `schema-spec.json`). Refresh those files when you update the catalog from the templates repo.

## Git: personal vs Dagster GitHub account

This repo is configured for the **eric-thomas-dagster** org (not your personal `ethomasii` account).

- **Commit identity (this repo only):** `user.name` / `user.email` are set with `git config --local` so commits match your Dagster profile. If GitHub shows “Unverified,” use an email [verified on that account](https://github.com/settings/emails) — often `YOURID+eric-thomas-dagster@users.noreply.github.com` or your work address. Update with:
  `git config user.email "you@company.com"`

- **Push authentication:** `origin` uses SSH host **`github-dagster`** (see `~/.ssh/config`). Create a dedicated key and add it to the **eric-thomas-dagster** GitHub user:
  ```bash
  ssh-keygen -t ed25519 -C "work-email" -f ~/.ssh/id_ed25519_dagster
  # add ~/.ssh/id_ed25519_dagster.pub to GitHub → Settings → SSH keys
  ssh -T git@github-dagster
  git push -u origin main
  ```

  Your default `github.com` SSH entry can keep using your personal key; this host alias forces the Dagster key for this remote only.

- **HTTPS instead:** switch remote to HTTPS and use a [PAT](https://github.com/settings/tokens) from the **eric-thomas-dagster** account when prompted:
  `git remote set-url origin https://github.com/eric-thomas-dagster/dagster-component-ui.git`
