# UnicLife Key Cabinet Frontend

Expo SDK 54 React Native app for the UnicLife key cabinet product.

## Structure

```text
src/app/          Expo Router routes
src/pages/        Page-level screens
src/features/     Business feature types and future hooks
src/components/   Reusable UI components
src/api/          Unified backend request layer
src/stores/       Frontend-only state
src/styles/       Theme and design tokens
tests/            Component and flow tests
```

All backend calls must go through `src/api`. Do not hardcode real API URLs, accounts, tokens, device numbers, or personnel data in screens.

## Commands

```bash
pnpm --filter @uniclife/frontend dev
pnpm --filter @uniclife/frontend lint
pnpm --filter @uniclife/frontend typecheck
```
