# UnicLife Key Cabinet Frontend

Expo SDK 54 React Native app for the UnicLife key cabinet product.

The current implementation is a frontend-only interactive prototype. Accounts,
QR binding, cabinet synchronisation, loans, and audit events
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
global.css                       Uniwind, Tailwind CSS 4, HeroUI, and design tokens
tests/                           Component and flow tests
```

Production backend calls must go through `src/api`. Prototype screens call the
asynchronous service exposed by `src/mocks` and must never import seed JSON
directly. Do not hardcode real API URLs, accounts, tokens, device numbers, or
personnel data in screens.

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

## Cabinet QR identity

Cabinet QR payloads use `uniclife://cabinet/<SKU>/<UUID>`. The SKU identifies
the product model and determines its metadata and slot capacity; the UUID
uniquely identifies one physical cabinet. Multiple cabinet UUIDs can therefore
share the same SKU. The first successful binding creates the cabinet record and
its slots, while later scans of the same SKU/UUID resolve that existing cabinet.
The local storage schema is v3; v1 and v2 prototype state is migrated to this
identity model during hydration.

The prototype supports `en-US`, `en-GB`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`,
`pt-PT`, `nl-NL`, `pl-PL`, `zh-CN`, and `zh-TW`, with system-locale selection or an in-app
override.

## UI conventions

- Use Uniwind/Tailwind CSS 4 `className` utilities and semantic tokens; do not add page-level `StyleSheet` objects.
- Use `useTranslation()` for every user-facing label. The current locale follows the operating system through `expo-localization`.
- Prefer Expo SDK or React Native components, then HeroUI Native, and only then project-owned implementations. Keep vendor APIs behind semantic components in `src/components/ui`.
- Platform-specific implementations live behind semantic components such as `AppIcon`, using `.ios.tsx` / `.android.tsx` files where required. HeroUI Native is used on iOS and Android; web keeps a project-owned fallback when the native package does not support web.
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
