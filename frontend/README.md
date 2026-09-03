# UnicLife Key Cabinet Frontend

Expo SDK 54 React Native app for the UnicLife key cabinet product.

The app uses the unified backend request layer for accounts, cabinet access,
loans, and audit events. Validated local mock data remains for isolated tests and
prototype tooling; no production email or cabinet hardware service is connected.

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
global.css                       Uniwind, Tailwind CSS 4, HeroUI, and design tokens
tests/                           Component and flow tests
```

Production backend calls must go through `src/api`. Prototype-oriented screens
consume the app-state action interface and must never import seed JSON directly.
Do not hardcode real API URLs, accounts, tokens, device numbers, or personnel
data in screens.

## Prototype walkthrough

1. Open the welcome screen and choose **Sign in**.
2. Use **Preview workspace** to enter the seeded workspace without a real
   credential.
3. Initialize or join a cabinet, or choose **Explore first** to open the main
   tabs immediately.
4. Use **Add cabinet** below the Home cabinet list to open the scanner; a sample code remains available when a camera is unavailable.
5. Use the Home loan summary to open the searchable checked-out-key list, filter by cabinet, status, or check-out time, and confirm a quick return.
6. Open Account > Developer settings to switch users, simulate offline mode, show a sample QR, or reset local data.

All seeded identities, contact details, SKU artwork and QR payloads are
fictional demo data. Generated cabinet artwork is presentation-only and does
not contain a scannable product code.

## Cabinet QR flows

Reusable product QR payloads use
`uniclife://cabinet/v1/init/<SKU>/<PRODUCT_CODE>`. All cabinets of the same SKU
scan the same printable code; each newly confirmed scan initializes a separate
cabinet instance and its slots. A repeated network submission with the same
request ID returns the original result instead of creating a duplicate.

Joining an existing cabinet requires a current Admin to generate a one-time
`uniclife://cabinet/v1/join/<OPAQUE_TOKEN>` QR in Cabinet Settings. The code
identifies exactly one cabinet, expires after ten minutes, and becomes invalid
after use, revocation, or replacement. The local mock storage schema remains v3;
older prototype state is normalized during hydration for isolated tests.

The prototype supports `en-US`, `en-GB`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`,
`pt-PT`, `nl-NL`, `pl-PL`, `zh-CN`, and `zh-TW`, with system-locale selection or an in-app
override.

## Product manuals

The product contract exposes an optional HTTP/HTTPS `manualUrl`. Home derives the
manual entry only from cabinets visible to the signed-in account and hides it when
none of those cabinet SKUs has a manual. The authenticated details route lists one
row per visible cabinet, including separate rows for cabinets sharing a SKU, and
opens each manual through `expo-web-browser`. The app never receives Admin or
database credentials; product metadata continues to come from the unified backend
request layer.

## UI conventions

- Use Uniwind/Tailwind CSS 4 `className` utilities and semantic tokens; do not add page-level `StyleSheet` objects.
- Use `useTranslation()` for every user-facing label. The current locale follows the operating system through `expo-localization`.
- Prefer Expo SDK or React Native components, then HeroUI Native, and only then project-owned implementations. Keep vendor APIs behind semantic components in `src/components/ui`.
- Platform-specific implementations live behind semantic components such as `AppIcon`, using `.ios.tsx` / `.android.tsx` files where required. HeroUI Native is used on iOS and Android; web keeps a project-owned fallback when the native package does not support web.
- Keep route page implementations directly in `src/app`. Small local components may stay in the route file; move larger domain components into `src/features/<domain>/components`.
- Keep non-route helpers outside `src/app`, and define Stack/Tab screen metadata in the nearest `_layout.tsx`.

## Commands

```bash
cp .env.example .env.local
pnpm dev:frontend
pnpm pro:frontend
pnpm --filter @uniclife/frontend lint
pnpm --filter @uniclife/frontend typecheck
pnpm --filter @uniclife/frontend test
pnpm --filter @uniclife/frontend exec expo export --platform web
```

For device development, set `EXPO_PUBLIC_API_BASE_URL_DEV` in `.env.local` to the
development Mac's LAN IPv4 address, for example
`http://192.168.1.100:4000/api/v1`, and set `EXPO_PUBLIC_API_BASE_URL_PRO` to the
Render API. Both commands run `expo start` directly so Metro keeps its interactive
terminal UI and Expo QR code. Run the frontend in its own terminal instead of a
combined parallel workspace command. The device and Mac must use the same local
network. Production builds obtain the pro public
variables from the EAS production environment and require an HTTPS API URL. Never
store a secret in an `EXPO_PUBLIC_*` variable because Expo embeds it in the client
bundle.

Customer-support replies use `expo-notifications` for a system banner, app-icon
badge, and deep link into the conversation. Run `eas init`, configure APNs/FCM
credentials, and use a notification-enabled development or production build;
remote push notifications are not available in Expo Go. The EAS project UUID is
normally embedded by EAS and may use `EXPO_PUBLIC_EAS_PROJECT_ID` as a public
fallback. Denying notification permission does not disable the in-app inbox.

Activity logs are read-only in the app and cannot be downloaded. All cabinet
memberships use the single Admin role. Key deletion is permanent; cabinet,
historical loan, and immutable audit records remain available for accountability.
Activity entries cannot be undone. Bulk deletion of cabinet key information does
not require active loans to be returned and retains those loan references.

Privacy Policy, Terms of Use, and How your data is used are presented as
effective-date, sectioned legal documents covering U.S. and European privacy
baselines. The contracting entity, legal address, governing law, transfer
mechanism, and dedicated legal contact must match the executed customer agreement
before production release.
