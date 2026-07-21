# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Frontend architecture rules

- Styling must use NativeWind. Do not add `StyleSheet.create` or ad-hoc React Native style objects when the component supports `className`.
- Colors, typography, spacing, radii, shadows, and navigation dimensions must come from `design-tokens.json` through `tailwind.config.js` or `src/styles/theme.ts`.
- All user-facing interface copy must use a key from `src/i18n`. Do not hardcode labels, placeholders, headings, confirmations, empty states, or client-generated error messages in components.
- Device locale detection must use `expo-localization`. New translation keys must be added to every supported locale and checked against the English schema.
- Prefer Expo SDK and React Native core components before introducing a custom or third-party component.
- When an Expo capability has different native implementations, place it behind one semantic component and use `.ios.tsx` / `.android.tsx` files. Keep the unsuffixed file only for a genuinely shared implementation or fallback.
- `src/app` is exclusively for Expo Router pages and layouts. Route files contain their page implementation; do not place helper components, hooks, utilities, or data modules in this directory because ordinary files are treated as routes.
- Small page-local components may stay in the route file. Larger business components belong in `src/features/<domain>/components` with their domain data, types, and hooks.
- Stack and tab screen metadata belongs in the nearest `_layout.tsx`. Do not add a second route registry that duplicates the file-based route tree.
- Shared UI primitives belong in `src/components/ui`; business data, types, hooks, and components remain under `src/features`.
