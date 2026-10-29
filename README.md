# Compi website

Static HTML, CSS and JavaScript for Compi. No application framework or runtime dependencies.

## Preview

Serve the repository with any static HTTP server, for example:

```sh
python -m http.server 8791 --bind 127.0.0.1
```

Open `http://127.0.0.1:8791` in a browser. Use `python3` instead of `python` where appropriate.

## Deploy to Cloudflare Pages

Requires Node.js and an authenticated Wrangler CLI with Pages access.

```sh
node --check scroll.js
node tools/build.mjs
wrangler pages deploy dist --project-name compi-marketing --branch main
```

Only `dist/` is deployed. The build checks local asset references and copies an explicit public-file allowlist, excluding design drafts, local skills and repository metadata.

Production: https://compi-marketing.pages.dev

This is a direct-upload Pages project. Pushing to GitHub does not automatically deploy it; run the deployment command after approving a change. Custom-domain attachment is separate.

## Content and appearance

- Downloads and platform caveats are pinned to the published Compi 0.5.0 release.
- Neutral is the default appearance. Warm Carbon uses the original semantic colors from Compi's `crates/compi-client/themes/warm-carbon.json`.
- Product screenshots and the recorded demo are real supplied media. They are not recolored by the page appearance toggle.
- Desktop uses sticky reading previews; mobile, short viewports and no-JavaScript browsers receive stacked views. Scrolling remains native.
