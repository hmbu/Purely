# Publishing and editing online (GitHub Pages, no watermark)

The presentation is a static site. GitHub Pages hosts it for free with no watermark or branding.

## How it works
- The workflow `.github/workflows/presentation-pages.yml` (at the repository root) publishes **only** this folder. The hotel project in the same repository is not published.
- It runs on every push that changes this folder, including each **Publish** from the control panel.
- Site: `https://hmbu.github.io/Purely/`, control panel: `https://hmbu.github.io/Purely/control.html`.
- Each **Publish** is a git commit to `content.json`. The full version history is in the **Backups** tab, where any version can be restored.
- Images, videos and fonts uploaded in the control panel are committed to `assets/<project>/uploads/`. They appear on the site after the next deployment (about one minute).

## One-time setup (owner of the repository)
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Environments → github-pages → Deployment branches:** add `ccr-87aacda0-76dx1f`. Alternatively, merge this branch into the default branch.
3. Create a token:
   - Go to **Settings (account) → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Repository access: only `hmbu/Purely`.
   - Permissions: **Contents: Read and write**.
4. Open the control panel on the site, go to the **Publish** tab, paste the token and press **Save and test connection**. The fields come pre-filled with owner `hmbu`, repo `Purely`, branch `ccr-87aacda0-76dx1f` and folder `presentation-bundle-lavara`.

The token stays in that browser's local storage only. It is never committed and never sent anywhere except `api.github.com`.

## Online vs. live show
| | Published site | Local launcher (`start.command` / `start.bat`) |
|---|---|---|
| Show, control panel, preview | ✓ | ✓ |
| Save | Publish = git commit | Auto-save to `content.json` + backups |
| Phone remote from another device | Same browser only | ✓ (Wi-Fi + QR) |
| Transition sounds without a click | After the first click | ✓ (Chrome launched with autoplay flag) |

For the meeting itself, use the launcher so the phone remote works. To get the latest content on that machine, run `git pull` or download the repository.
