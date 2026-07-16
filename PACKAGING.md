# Packaging & Force-Install (no developer mode)

By default this extension is loaded via **Load unpacked**, which requires Edge's
developer mode to stay on - and Edge nags you to turn it off. Turning developer
mode off **disables** all unpacked extensions (they aren't deleted, but they
stop running).

To run the extension permanently **without** developer mode, install it through
Windows policy (`ExtensionInstallForcelist`). Policy-installed extensions don't
need developer mode, don't show the nag, and can't be casually disabled. This
requires a **stable extension ID**, a **signed CRX**, and an **update manifest**
hosted somewhere over HTTPS.

This reuses the same hosting infrastructure and signing pattern as the
`CustomAddBookmark` and `URLCopyExtension` extensions - see those repos'
`PACKAGING.md` / `AUTOUPDATE-TROUBLESHOOTING.md` for the full background.

## This extension's identity

- **Extension ID:** `jlekpohdekfjeicdogjmehnbjdllldfp`
- The ID is derived from `key.pem` (the signing key) and pinned in
  `manifest.json` via the `key` field, so the unpacked build and the CRX build
  share the same ID.

> `key.pem` is the private signing key. It is **gitignored** and must be kept
> secret and **backed up** (e.g. alongside the GitHub PAT in the vault's
> gitignored `claude-config/`). If you lose it you can't ship updates under the
> same ID. To recreate the values from an existing key, run `npm run keygen`.

Unlike `URLCopyExtension`, this extension **does** store settings in
`chrome.storage.local` (provider + API key, see `src/shared/storage.ts`) via
its options page. `chrome.storage.local` is keyed by extension ID, not by
install method, so as long as the ID stays pinned to `key.pem` (which it is),
settings survive rebuilds and redeploys - there is no reset-on-reinstall
caveat as long as you never regenerate `key.pem`.

## One-time: build the CRX and update manifest

```powershell
npm install                # installs esbuild, typescript, crx3
npm run crx                 # -> dist/reddit-comment-sentiment.crx and dist/update.xml
```

`npm run crx` runs the normal esbuild `build` first (bundles `background.js`,
`content.js`, `popup/popup.js`, `options/options.js`, and copies
`manifest.json` + static HTML/CSS into `dist/`), then stages `dist/update.xml`
and - if `crx3` is installed - packs `dist/reddit-comment-sentiment.crx`
signed with `key.pem`.

The build **refuses to pack** if `manifest.json`'s `update_url` is missing or
doesn't match `UPDATE_BASE` - this is a deliberate guard against the exact bug
that got CustomAddBookmark's install stuck (see
[Auto-update requires `update_url`](#auto-update-requires-update_url-in-the-manifest)
below).

The hosting base URL defaults to `https://mcp.tendimensions.com/extensions/reddit-comment-sentiment`.
Override it if you host elsewhere:

```powershell
$env:UPDATE_BASE = "https://example.com/ext/reddit-comment-sentiment"; npm run crx
```

### Manual packing (if you skip crx3)

`edge://extensions` -> **Pack extension**:
- **Extension root directory:** `dist`
- **Private key file:** `key.pem`

This produces `dist.crx`; rename it to `reddit-comment-sentiment.crx`.

## Host the files

nginx on the Linode serves `/extensions/` as static files from
`/var/www/extensions/` (shared with CustomAddBookmark and URLCopyExtension).
This extension gets its own subfolder - no nginx config change needed:

```
https://mcp.tendimensions.com/extensions/reddit-comment-sentiment/reddit-comment-sentiment.crx
https://mcp.tendimensions.com/extensions/reddit-comment-sentiment/update.xml
```

### (Re)deploy

`/var/www` is root-owned and `jason` has no passwordless sudo, so upload to `/tmp`
then move into place with sudo. From a machine with the build output:

```powershell
scp dist/reddit-comment-sentiment.crx dist/update.xml jason@ssh.tendimensions.com:/tmp/
```

Then on the Linode:

```bash
sudo install -d -m 755 /var/www/extensions/reddit-comment-sentiment
sudo install -m 644 /tmp/reddit-comment-sentiment.crx /tmp/update.xml /var/www/extensions/reddit-comment-sentiment/
```

Verify:

```bash
curl -fsSI https://mcp.tendimensions.com/extensions/reddit-comment-sentiment/reddit-comment-sentiment.crx   # 200
curl -fsS  https://mcp.tendimensions.com/extensions/reddit-comment-sentiment/update.xml                     # right id/version
```

## Force-install on each machine (Windows registry)

You don't open or drag the `.crx` in - Edge blocks off-store CRX installs. Instead
the policy tells Edge to fetch and install it itself from the update URL. So
"installing" = applying the registry entry and restarting Edge.

Add the extension to Edge's force-install list. The value data is
`<extension-id>;<update-manifest-url>`. All force-installed extensions share
this one registry key, each on its own numbered value. As of this writing,
`HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist` value `1` is
taken by `CustomAddBookmark` (`gfiibmofoaflbkbfglbijbdpfjedljne`), so this
extension should use `2` - re-check the key before applying in case that's
changed.

Via an elevated PowerShell:

```powershell
$key = "HKLM:\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist"
New-Item -Path $key -Force | Out-Null
New-ItemProperty -Path $key -Name "2" `
  -Value "jlekpohdekfjeicdogjmehnbjdllldfp;https://mcp.tendimensions.com/extensions/reddit-comment-sentiment/update.xml" `
  -PropertyType String -Force | Out-Null
```

Then:

1. Fully restart Edge (kill all `msedge.exe` processes, not just close windows).
2. Visit `edge://policy` and confirm `ExtensionInstallForcelist` is listed.
3. Visit `edge://extensions` - the extension appears as **Installed by your
   organization** and can't be toggled off. You can now turn developer mode off.
4. Remove the old unpacked copy if it's still loaded (to avoid a duplicate).
5. Re-enter the provider + API key in the options page if this is a fresh
   profile/machine that never had the unpacked dev build's settings.

## Updating to a new version

1. Bump `version` in `manifest.json` (and `package.json`).
2. `npm run crx`.
3. Re-deploy **both** files (see [(Re)deploy](#redeploy)) - `update.xml` must
   advertise the new version or Edge won't update.
4. Edge picks up the new version automatically (within a few hours, or
   immediately via `edge://extensions` -> **Update**).

## Auto-update requires `update_url`

The force-install policy string (`<id>;<update-url>`) is only used for the
**initial** install. For ongoing update checks, Edge/Chrome use the `update_url`
field inside the installed extension's own `manifest.json`. If that field is
missing, the browser checks the **web stores** instead - which don't have this
off-store extension, so it silently never updates past the first install.

`manifest.json` therefore sets:

```json
"update_url": "https://mcp.tendimensions.com/extensions/reddit-comment-sentiment/update.xml"
```

This was baked in **before the very first build**, so there is no version of
this extension in the wild that lacks it. `scripts/pack.js` also refuses to
pack a CRX if this field is missing or wrong, as a permanent guard against
repeating the CustomAddBookmark mistake (see its `AUTOUPDATE-TROUBLESHOOTING.md`).

## Notes / gotchas

- The same ID is used for the unpacked dev build and the force-installed build,
  so you can develop unpacked and ship via policy without ID drift.
- Force-install via a self-hosted update URL is supported by Edge policy; it does
  not require the Edge Add-ons store.
- Settings (`provider`, `apiKey` in `chrome.storage.local`) are per-extension-ID,
  not per-install-method - switching between unpacked and force-installed on the
  *same* machine keeps them, since the ID never changes. A brand-new machine/profile
  still needs the options page filled in once.

## Reusing this for other custom extensions

See `CustomAddBookmark/PACKAGING-PROMPT.md` for the general reusable process -
this extension followed it, same as `URLCopyExtension`.
