# Deploying to GitHub Pages with a custom domain

Nothing here assumes the domain has been bought yet. Steps 1–2 work today with the free `github.io` address; steps 3–6 are for after the purchase.

## 1. Turn on GitHub Pages (once)

1. Push the project to GitHub (branch `main`).
2. Repository → **Settings → Pages**.
3. **Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab. The *Deploy to GitHub Pages* workflow runs on every push to `main`: install, run tests, `npm run build`, deploy `_site/`.
5. The site appears at `https://<username>.github.io/<repository>/`.

If the workflow fails at "Run tests", open the run log; nothing is deployed until tests pass.

## 2. Check the deployed site

Open each page, the dashboard, `/admin/` (password `VVU2026` unless changed), the map and a video slot. Use the browser's developer tools → Network to confirm no file returns 404.

## 3. Buy the domain

Any registrar works (for example a `.com`, or a `.com.gh` through a Ghanaian registrar). Decide whether the main address will be the apex (`greencampus.com`) or `www.greencampus.com`. Using **`www`** as the main address is the most reliable choice; GitHub redirects the other form automatically when both are configured.

## 4. Add DNS records at the registrar

In the registrar's DNS settings, remove any existing parking `A`/`CNAME` records for `@` and `www`, then add:

**Apex domain (`@`)**: four `A` records

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

Optional IPv6 (`AAAA`, host `@`): `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

**`www` subdomain**

| Type | Host | Value |
|---|---|---|
| CNAME | www | `<username>.github.io` |

Use your GitHub **username or organisation name** followed by `.github.io`, without the repository name. Do not use wildcard (`*`) records.

These are GitHub's published Pages addresses at the time of writing; confirm them in GitHub Docs → "Managing a custom domain for your GitHub Pages site" before entering them.

DNS changes can take from a few minutes up to 48 hours. Check progress with `nslookup www.your-domain.com` or an online DNS checker.

## 5. Tell GitHub and the project about the domain

1. Replace the placeholder in the `CNAME` file at the project root with the domain only, e.g. `www.greencampus.com` (no `https://`, no slash). Commit and push. (With Actions deployment GitHub reads the domain from Settings, so this file is documentation for the team; the build skips it while it still contains the placeholder.)
2. Update `SITE_URL` in `assets/js/config.js`.
3. Repository → **Settings → Pages → Custom domain**: enter the same domain → **Save**. GitHub runs a DNS check.
4. Recommended: verify the domain for your account (GitHub → your profile **Settings → Pages → Add a domain**) to prevent anyone else claiming it.

## 6. Enable HTTPS

When the DNS check passes, GitHub issues a free certificate (this can take up to an hour). Then tick **Enforce HTTPS** in Settings → Pages. If the box is greyed out, wait and refresh; if it stays unavailable for a day, re-save the custom domain.

## Checklist after the domain is live

- [ ] `https://` loads with a padlock; `http://` redirects to `https://`
- [ ] Apex and `www` both reach the site
- [ ] All six public pages, images, styles and scripts load (no 404s in developer tools)
- [ ] `/admin/` opens the login page; the password works; Log out returns to login
- [ ] Map tiles and video embeds load
- [ ] A wrong address shows the custom 404 page
- [ ] After one visit, the pages open with Wi-Fi switched off

## Important: data and domains

IndexedDB data belongs to a **specific address**. Records saved at `username.github.io/repo/` will **not** appear at `www.your-domain.com`, and `www` and the apex are also separate. Before switching, export a backup on the old address (Admin → Data Management) and import it on the new one, and always present from the final address.

## Troubleshooting

| Problem | Fix |
|---|---|
| Site shows the README or a 404 | Settings → Pages source must be **GitHub Actions**; check the latest workflow run succeeded |
| Pages load without styling | Open developer tools → Network; a 404 means a file was not committed (file names are case-sensitive on GitHub Pages) |
| "Domain does not resolve" | DNS still propagating, or the records are wrong; compare with step 4 |
| HTTPS cannot be enforced | Certificate not issued yet; wait, then re-save the custom domain |
| Old content after an update | The service worker updates on the next visit; refresh once more, or hard-reload |
