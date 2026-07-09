# UI Review Checklist — Nice Price Bazar Mobile

Use this checklist when reviewing new or changed screens in `apps/mobile`. Goal: professional iOS-first shop app that reflects Nice Price Bazar — not a generic template.

---

## Brand & copy

- [ ] Customer-facing name reads **Nice Price Bazar** (or agreed interim name) — not “DoubleA Commerce” on shopper UI
- [ ] Copy is short, practical, local-shop tone — no AI marketing fluff
- [ ] Prices formatted consistently via `PriceDisplay` component
- [ ] Sale / discount badges use brand-appropriate colors (red/yellow direction)
- [ ] Company pricing clearly labeled when active

## iOS Liquid Glass

- [ ] Glass used for chrome only (tab bar, search, FAB, summary cards) — not dense product lists
- [ ] No glass-on-glass stacking (blur over blur)
- [ ] iOS blur via `GlassView`; Android fallback opaque — tested mentally per `glass.useBlur`
- [ ] Borders use `glass.borderWidth` / theme tokens — not ad-hoc rgba

## Layout & navigation

- [ ] `ScreenContainer` handles safe areas
- [ ] Tab screens: content clears floating tab bar (`bottomInset` / padding)
- [ ] `FloatingActionBar` uses `avoidTabBar` on tab routes when pinned bottom
- [ ] No nested `FlatList` inside parent `ScrollView`
- [ ] Back navigation after auth uses `replace` where stack may be empty

## Typography & spacing

- [ ] Uses `typography.*` scale — no random font sizes
- [ ] Uses `spacing.*` — consistent horizontal padding (typically 16–20)
- [ ] Touch targets ≥ 44pt effective area for primary actions

## Components

- [ ] Reuses `AppButton`, `AppInput`, `ProductCard`, `OrderCard`, `EmptyState`, etc.
- [ ] New UI extends theme — does not duplicate color hex
- [ ] Loading states use `LoadingSkeleton` — not spinners everywhere
- [ ] Empty states: one clear message + one action

## Role-specific

### Shopper

- [ ] Guest can browse; auth gate only where required
- [ ] Cart badge updates via `useCartCount`
- [ ] Company toggle only for approved company role

### Delivery driver

- [ ] High-contrast status buttons
- [ ] Map + address readable at glance
- [ ] Status update refreshes list and detail queries

## Motion & haptics

- [ ] Haptics on meaningful events (cart add, order placed) — not every press
- [ ] No gratuitous animation delaying checkout or delivery actions

## Accessibility & contrast

- [ ] Text on glass/surface meets readable contrast
- [ ] Error states visible without color alone (icon or message)
- [ ] Form labels associated with inputs

## Device considerations

- [ ] Layout OK on small phone (iPhone SE class) — no clipped FAB
- [ ] Keyboard does not cover primary submit on forms
- [ ] Long product names truncate gracefully

## Regression guards

- [ ] Login merges guest cart
- [ ] Admin role cannot use shopper app (alert + logout)
- [ ] Delivery agent redirected away from shopper tabs

## Screenshot sign-off (before release)

Capture for review:

1. Home (logged out + logged in)
2. Product detail
3. Cart + checkout
4. Company profile (pending + approved)
5. Delivery dashboard + map + order detail
6. Login / register

---

**Pass criteria:** All critical items checked; known gaps documented in PR or issue tracker.
