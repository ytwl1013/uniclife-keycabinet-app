# Download page, fixed QR code and Android release

Users scan one printed QR code. It opens the download page hosted on GitHub Pages,
and the page sends each visitor to the right place:

```text
QR code ──> https://ytwl1013.github.io/uniclife-keycabinet-app/
                 ├─ iPhone  : /ios/      ──> instructions (App Store link once the app is live)
                 └─ Android : /android/  ──> GitHub Release asset uniclife-android.apk
```

The QR code never changes. Changing where a platform downloads from, or adding
instructions, only requires editing the page and merging to `main`.

The printed QR code is [uniclife-download-qr.png](./uniclife-download-qr.png).
The vector version for print is [uniclife-download-qr.svg](./uniclife-download-qr.svg).
Both encode:

```text
https://ytwl1013.github.io/uniclife-keycabinet-app/
```

## Where the pages live

The pages are part of this repository, in [`site/`](../../site):

- `site/generate_download.py` holds all wording and links and generates the pages.
- `site/assets/` and `site/favicon.svg` are copied unchanged into the site.
- `site/dist/` is the generated output. It is git-ignored and never committed.

The generated site has the home page (picks the visitor's system and highlights
it), `/ios/`, `/android/`, and a Simplified Chinese copy of each under `zh-cn/`.
Privacy and Support links point at the separate legal site
(`ytwl1013/uniclife-legal`), which keeps its own URLs because they are registered
in App Store Connect and Google Play Console.

Preview locally:

```bash
python3 -I site/generate_download.py
python3 -m http.server 4173 --directory site/dist
```

### Publishing

`.github/workflows/pages.yml` builds `site/` and deploys **only** `site/dist` to
GitHub Pages. It runs when a change under `site/` (or the workflow itself) reaches
`main`, or manually from **Actions → Deploy download site → Run workflow**. The
change itself goes through the normal pull request flow (`dev` then `main`).

One-time repository setting: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Do not use "Deploy from a branch": that would publish the whole
repository, including `docs/` and the `.ipa` build file stored there.

### Changing links

Edit the constants at the top of `site/generate_download.py`:

- `APP_STORE_URL`: empty by default. While empty, the iPhone page shows no button
  and tells visitors to search the App Store for `APP_STORE_SEARCH_NAME`. Once
  the app is live, paste the App Store link (for example
  `https://apps.apple.com/app/id6809292074`) and the button and button-based
  steps appear automatically.
- `ANDROID_APK_URL`: the GitHub Release `latest` asset. Change it only if the APK
  moves to another host.

## Android release (APK)

The APK is built by GitHub Actions and published to this repository's Releases.
The release workflow always uploads it with the exact asset name
`uniclife-android.apk`. GitHub's `latest` redirect therefore always reaches the
newest non-draft, non-prerelease release, so the download page never needs a
version number.

1. Update `frontend/app.json`'s `expo.version` (for example `1.0.0`), and merge
   the change to `main` through the repository's normal pull request process.
2. Create and push the matching tag from the release commit:

   ```bash
   git tag android-v1.0.0
   git push origin android-v1.0.0
   ```

3. GitHub Actions runs `Android release`, uses the EAS `apk` profile, and
   publishes the signed APK to the GitHub Release. The repository secret
   `EXPO_TOKEN` must contain an Expo access token with permission to build this
   project.

This repository must stay publicly readable. If it is made private, anonymous
visitors can no longer download the APK; set `ANDROID_APK_URL` in
`site/generate_download.py` to a public CDN or download endpoint instead.

## iPhone

Until the app is live on the App Store, the iPhone page tells visitors to search
for UnicLife in the App Store (no link, no button). After release, set
`APP_STORE_URL` (see above) to show the "Open in App Store" button. TestFlight
links are invitation-based and should not be used on the public page.
Publishing a new iOS version is done with EAS Build and Submit, then App Store
review; see [../release-process.md](../release-process.md).

## Updates without scanning again

The production APK is configured for EAS Update on the `production` channel.
JavaScript and bundled asset changes can be published from GitHub Actions using
`Publish EAS Update` and its message input, or locally from `frontend/`:

```bash
pnpm dlx eas-cli@latest update \
  --channel production \
  --message "Describe the update" \
  --environment production
```

Installed release builds check this channel on launch, download a compatible
update, and apply it on the next launch. Users keep the same installed app and
do not scan the QR code again. Native changes (permissions, native modules,
package name, or an SDK upgrade) still require a new `android-vX.Y.Z` APK
release; the `appVersion` runtime policy prevents an OTA update from being
applied to an incompatible native binary.

Keep `EXPO_PUBLIC_API_BASE_URL_PRO` and the other public production variables in
the EAS `production` environment. Never put `EXPO_TOKEN` or signing material in
the repository or in an `EXPO_PUBLIC_*` variable.

## Regenerating the QR code

Only needed if the download page address changes (default is the Pages address above):

```bash
DOWNLOAD_PAGE_URL=https://example.com/ \
  pnpm download:qr
```
