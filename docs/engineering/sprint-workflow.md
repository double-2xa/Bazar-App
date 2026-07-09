# Sprint Workflow

Lightweight workflow for building **Nice Price Bazar** on the DoubleA Commerce monorepo. Adapt cadence to team size — principles stay the same.

---

## Roles & surfaces

| Surface | Owners typical focus |
|---------|---------------------|
| `apps/mobile` | Shopper + driver UX, iOS polish, brand |
| `apps/api` | Data model, business rules, security |
| `apps/admin` | Catalog, orders, users, agents |
| `packages/shared` | Contracts shared by mobile + API |

---

## Sprint rhythm (suggested 1–2 weeks)

### 1. Plan

- Pick items tied to shop outcomes: “company buyer checks out faster”, “driver completes delivery in 3 taps”
- Each item names affected app(s) and acceptance criteria
- Brand-only work separated from feature work when possible
- Check `MOBILE_IOS_STABILIZATION_REPORT.md` and open gaps before adding new scope

### 2. Build

- Branch from `main` (or team default)
- Read `.cursor/rules/` for the area you touch
- Order of implementation for features:
  1. `packages/shared` (types/validators)
  2. `apps/api` (endpoint + migration)
  3. `apps/mobile` and/or `apps/admin`
  4. Seed data if needed for QA
- Keep PRs reviewable — prefer multiple small PRs over one giant diff

### 3. Verify

- Run `docs/engineering/definition-of-done.md`
- Mobile: `npx tsc --noEmit`, manual flows on iOS simulator or device
- API: hit endpoints with demo accounts from `packages/shared`
- UI changes: `docs/design/ui-review-checklist.md`

### 4. Review

- Reviewer checks role guards, cart/auth edge cases, and brand tone
- UI PRs include screenshots (iPhone frame preferred)
- API PRs include example request/response or Swagger note if applicable

### 5. Release / demo

- Demo accounts:

  | Role | Email | Password |
  |------|-------|----------|
  | Admin | admin@doublea.com | Admin123! |
  | Shopper | user@doublea.com | User123! |
  | Company | company@doublea.com | Company123! |
  | Driver | delivery@doublea.com | Delivery123! |

- Stakeholder demo on **real device** for mobile — blur and haptics do not show on web alone
- Note env: `EXPO_PUBLIC_API_URL` must be LAN IP for physical phones

---

## Work types

### Brand alignment sprint

1. Finalize tokens in `docs/design/nice-price-bazar-brand.md`
2. Update theme files
3. Assets (icon, splash)
4. Copy pass on customer strings
5. UI review checklist sign-off

**No feature creep** during brand sprint.

### Feature sprint

- User story → API contract → UI → seed → DoD
- If API already exists, do not duplicate business logic on client

### Stabilization / bugfix

- Reproduce → minimal fix → regression note in PR
- Reference stabilization report patterns (cart merge, query invalidation, FAB inset)

---

## Cursor-assisted development

- Start sessions with scope: app + goal + “no refactor” if needed
- Point agents at rules: “follow `03-mobile-ios-ui.mdc`”
- Use `09-cursor-workflow.mdc` for commit/PR discipline
- Docs-only tasks: explicitly say no app code changes

---

## Backlog themes (from current state)

Priority order is product decision — typical sequence:

1. **Brand** — Nice Price Bazar naming and red/yellow tokens
2. **Geo** — Address map picker; seed lat/lng
3. **Delivery** — Live tracking (needs API design)
4. **Reviews** — Mobile review UI (API exists)
5. **Android maps** — Release config + API key
6. **UX polish** — Post-login return to checkout; register cart merge

---

## Definition of sprint success

Shipped items meet **Definition of Done**, demo cleanly on iOS, and move the real shop closer to daily use — not just “more code merged.”
