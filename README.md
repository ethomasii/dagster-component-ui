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
