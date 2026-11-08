# Marketing site

Static landing page. No framework, no dependencies, Node ≥ 18.

```
src/                 source (HTML/CSS/JS/assets) with {{NAME}} {{URL}} {{EMAIL}} tokens
site.config.json     the three values that change on a rename: name, url, email
scripts/build.mjs    src/ → dist/, fills tokens, writes robots/sitemap/_headers
scripts/og.swift     renders the 1200×630 share image (macOS)
server.mjs           dev server: builds, watches src/, serves dist/
dist/                generated, git-ignored
```

## Develop

```bash
npm run dev      # http://localhost:5173  (PORT=… to change)
```

Edits to `src/` or `site.config.json` rebuild automatically; refresh the browser.

## Rename or rebrand

1. Edit `site.config.json` (`name`, `url`, `email`).
2. `npm run og` to regenerate `src/assets/og.png` with the new name.
3. Replace `src/favicon.svg`, `src/assets/mark.svg`, `app-icon.png` and `apple-touch-icon.png` if the mark changes.

Copy that mentions the product by name uses `{{NAME}}`, so no search-and-replace is needed.

## Deploy (Cloudflare Pages)

Prerequisites: a domain, and `url` and `email` filled in `site.config.json` (use `https://example.com`, no trailing slash or path).
`npm run build` refuses to run while either is empty, so a placeholder can’t ship.

1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build settings:
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
4. Deploy, then Custom domains → add the domain. If the domain’s DNS is on Cloudflare this is one click; otherwise add the CNAME shown.
5. Set up the mailbox for the `email` address (Cloudflare Email Routing forwards it for free).

## Pre-launch checklist

- [ ] `npm run build` succeeds with real `url` and `email`
- [ ] `dist/_headers` is present (Cloudflare applies it: CSP, HSTS, frame denial, caching)
- [ ] `https://<domain>/robots.txt` and `/sitemap.xml` load and show the real domain
- [ ] Paste the URL into a share-preview tool (Slack, iMessage, LinkedIn Post Inspector) and confirm the card
- [ ] Visit `/nope` and confirm the 404 page appears
- [ ] Submit the sitemap in Google Search Console
- [ ] Re-read every claim on the page against the product; the footnote must stay accurate

## Security brief

`src/security/index.html` (served at `/security/`, styles in `src/security.css`) is written for CISOs. Every claim on it traces to the product repo's `docs/THREAT_MODEL.md`, `docs/SBOM.md`, `docs/adr/` and `docs/PHASE0_SPIKE_RESULTS.md`. When the product changes:

- Update the "Last reviewed" date in the page header.
- Move items between **Verified**, **Unit-tested** and **Open** as they are completed.
- Never add a claim the product docs do not support. The page lists limits on purpose.

## Notes

- The CSP forbids inline scripts and styles. Keep JS in `src/main.js` and CSS in `src/styles.css`, and avoid `style=""` attributes.
- `_headers` is a Cloudflare Pages/Netlify feature. On other hosts, translate it into that host’s header config.
