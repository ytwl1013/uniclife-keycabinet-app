# Account redesign QA

**Comparison target**

- Source visual truth: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-236ad0d6-89db-4bc6-ba70-f318cd667586.png`
- Native regression evidence: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-fd96c7d3-4cf2-45cf-a2cf-da722414f644.jpg` and `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-de0927c9-41f6-44bc-93b9-03b48b3d20ab.jpg`
- Rendered implementation: `C:\Users\Admin\.codex\visualizations\2026\07\23\019f8dfc-12c9-7690-b36b-83cdf74eeec5\account-width-fixed-viewport.png`
- Full-view comparison: `C:\Users\Admin\.codex\visualizations\2026\07\23\019f8dfc-12c9-7690-b36b-83cdf74eeec5\account-width-fix-comparison.png`
- Route and state: authenticated Account tab, English, light theme, mock user with two cabinets, email preferences off
- Browser viewport: 390 x 844 CSS px
- Source pixels: 573 x 1196
- Browser capture pixels: 878 x 1266 before cropping; 483 x 1046 normalized app viewport
- Density normalization: the in-app browser capture contained extra horizontal capture area, so the 390 px Account viewport was isolated before the side-by-side comparison. DOM bounds were also checked independently.

**Findings**

- No actionable P0, P1, or P2 visual mismatches remain.
- The Account content now occupies the expected page width. At the 390 px browser viewport, section headings span `x=20..370` and action rows span `x=28..362`, matching the intended page gutters.
- Profile, Preferences, Security, and App settings cards align to the same grid. Labels no longer wrap because of a shrink-wrapped native `ScrollView` content container, and section titles no longer overlap adjacent cards.
- The implementation preserves the requested structure: no Account header, centered identity, three summary metrics, rounded grouped rows, full-row actions, leading icons, trailing chevrons, and the existing application color theme.
- Intentional content differences remain product-specific: the reference uses anonymized ride data and a photo, while the implementation keeps the current cabinet/account data and initials avatar.

**Required fidelity surfaces**

- Fonts and typography: the existing Noto Sans hierarchy and weights are retained. Profile labels, row labels, captions, and all three metric columns remain readable without unwanted wrapping at 390 px.
- Spacing and layout rhythm: 20 px page gutters, full-width cards, 24 px card radii, 64 px minimum action rows, and consistent section gaps follow the reference composition.
- Colors and visual tokens: existing background, surface, brand blue, foreground, muted text, semantic danger, and shadow tokens are unchanged.
- Image quality and asset fidelity: no new raster asset was needed. The initials avatar and established icon library remain sharp and consistent with the app.
- Copy and content: all existing localized Account actions and product copy are retained.

**Interaction evidence**

- Language & region opens and closes its dialog in the browser; after closing it, the Activity and Account tabs remain interactive.
- The native HeroUI sheet wrapper is now kept mounted and receives the controlled `isOpen={visible}` state, allowing HeroUI to observe the required closed-to-open transition instead of leaving only an invisible overlay mounted.
- Privacy Policy, Terms of Use, How your data is used, Change password, Delete account, and Developer settings retain their expected routes.
- Every settings action uses the complete row as its press target, with a 4 px hit slop and a 64 px minimum row height.
- Native iOS bundle compilation returns HTTP 200. A physical Expo Go confirmation is still required for the native animation and touch layer because browser interaction exercises the web overlay implementation.

**Focused region comparison**

- No separate focused crop is required. The normalized side-by-side image keeps the profile hero, three metrics, card gutters, row labels, icons, chevrons, Preferences control, and Security rows legible.

**Comparison history**

- Pass 1 — P2 native width regression: removing the explicit full-width content layer caused the native `ScrollView` content container to shrink-wrap its children. The supplied iOS screenshots showed cards at roughly half the available width, wrapped labels, and section overlap.
- Fix: separated scroll padding from page width and added a `mx-auto w-full max-w-content` inner layout view.
- Pass 2 — post-fix evidence: the normalized comparison shows full-width cards with consistent gutters and no text overlap. Browser DOM bounds independently confirm the full 334 px action-row width inside a 390 px viewport.

**Implementation checklist**

- [x] Restore a full-width Account content layer on native and web.
- [x] Preserve the reference-derived Account composition and current theme.
- [x] Keep the native HeroUI BottomSheet mounted and drive it through `isOpen`.
- [x] Verify language overlay dismissal and persistent tab interaction in the browser.
- [x] Run type checking, lint, the full unit-test suite, and an iOS Metro bundle compile.

**Follow-up polish**

- Confirm one open/close cycle for Language and Sign out in Expo Go on the physical iPhone. This is a runtime confirmation gap, not a remaining visual mismatch.

final result: passed
