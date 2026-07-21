# UnicLife Key Cabinet Frontend

Expo SDK 54 React Native app for the UnicLife key cabinet product.

## Structure

```text
src/app/                         Expo Router pages and layouts
src/features/                    Business components, data, types, and hooks
src/components/ui/               Reusable UI primitives
src/i18n/                        Locale detection, translations, and typed keys
src/api/                         Unified backend request layer
src/stores/                      Frontend-only state
src/styles/                      Runtime theme bridge
design-tokens.json               Shared visual tokens
tailwind.config.js               NativeWind token mapping
tests/                           Component and flow tests
```

All backend calls must go through `src/api`. Do not hardcode real API URLs, accounts, tokens, device numbers, or personnel data in screens.

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
```
