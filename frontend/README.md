# UnicLife Key Cabinet Frontend

Expo SDK 54 React Native app for the UnicLife key cabinet product.

The current implementation is a frontend-only interactive prototype. Accounts,
QR binding, cabinet synchronisation, loans, audit events, recovery and exports
are simulated locally; no production email, hardware, database or remote sync
service is connected.

## Structure

```text
src/app/                         Expo Router pages and layouts
src/features/                    Business components, data, types, and hooks
src/mocks/                       Validated JSON seeds, local overlay, and mock services
src/components/ui/               Reusable UI primitives
src/i18n/                        Locale detection, translations, and typed keys
src/api/                         Unified backend request layer
src/stores/                      Frontend-only state
src/styles/                      Runtime theme bridge
design-tokens.json               Shared visual tokens
tailwind.config.js               NativeWind token mapping
tests/                           Component and flow tests
```

Production backend calls must go through `src/api`. Prototype screens call the
asynchronous service exposed by `src/mocks` and must never import seed JSON
directly. Do not hardcode real API URLs, accounts, tokens, device numbers, or
personnel data in screens.

## Prototype walkthrough

1. Open the welcome screen and choose **Sign in**.
2. Use **Use demo owner account** to enter the seeded workspace without a real
   credential.
3. Initialize or join a cabinet, or choose **Explore first** to open the main
   tabs immediately.
4. Use the Scan tab's sample-code action when a camera is unavailable.
5. Open Account > Demo controls to switch users, simulate offline mode, advance
   time, restore a cleared batch, or reset the local data.

All seeded identities, contact details, SKU artwork and QR payloads are
fictional demo data. Generated cabinet artwork is presentation-only and does
not contain a scannable product code.

The prototype supports `en-US`, `en-GB`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`,
`pt-PT`, `nl-NL`, and `pl-PL`, with system-locale selection or an in-app
override.

## UI conventions

- Use NativeWind `className` utilities and semantic tokens; do not add page-level `StyleSheet` objects.
- Use `useTranslation()` for every user-facing label. The current locale follows the operating system through `expo-localization`.
- Prefer Expo/React Native components. Platform-specific implementations live behind semantic components such as `AppIcon`, using `.ios.tsx` / `.android.tsx` files where required.
- Keep route page implementations directly in `src/app`. Small local components may stay in the route file; move larger domain components into `src/features/<domain>/components`.
- Keep non-route helpers outside `src/app`, and define Stack/Tab screen metadata in the nearest `_layout.tsx`.

## Commands

```bash
pnpm --filter @uniclife/frontend dev
pnpm --filter @uniclife/frontend lint
pnpm --filter @uniclife/frontend typecheck
pnpm --filter @uniclife/frontend test
pnpm --filter @uniclife/frontend exec expo export --platform web
```

The export service creates CSV, XLSX and PDF files. Web uses a Blob download;
iOS and Android use the file cache and system share sheet. Member exports mask
borrower contact details, while Owner/Admin full-detail exports require an
additional confirmation.
