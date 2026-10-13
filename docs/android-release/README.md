# Android release and fixed download QR code

The printed QR code is [uniclife-android-download-qr.png](./uniclife-android-download-qr.png).
The vector version for print is [uniclife-android-download-qr.svg](./uniclife-android-download-qr.svg).
Both encode the stable URL:

```text
https://github.com/ytwl1013/uniclife-keycabinet-app/releases/latest/download/uniclife-android.apk
```

The release workflow always uploads the APK with the exact asset name
`uniclife-android.apk`. GitHub's `latest` redirect therefore keeps the printed QR
code unchanged while every scan reaches the newest non-draft, non-prerelease
release.

## First release and later native releases

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

The repository must be publicly readable for anonymous phone downloads. If the
repository is private, set `ANDROID_DOWNLOAD_URL` to a public CDN or download
endpoint before regenerating the QR code; a private GitHub Release cannot be
downloaded by a customer who has not signed in to GitHub.

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
update, and apply it on the next launch. Users keep the same installed APK and
do not scan the QR code again. Native changes (permissions, native modules,
package name, or an SDK upgrade) still require a new `android-vX.Y.Z` APK
release; the `appVersion` runtime policy prevents an OTA update from being
applied to an incompatible native binary.

Keep `EXPO_PUBLIC_API_BASE_URL_PRO` and the other public production variables in
the EAS `production` environment. Never put `EXPO_TOKEN` or signing material in
the repository or in an `EXPO_PUBLIC_*` variable.

Regenerate the printable files only if the download host changes:

```bash
ANDROID_DOWNLOAD_URL=https://example.com/android \
  pnpm android:qr
```
