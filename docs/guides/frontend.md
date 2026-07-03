# Frontend Developer Guide

The Upcheck mobile app: **Expo SDK 54**, **React Native 0.81**, TypeScript, `zustand` state, `i18next` localization, `expo-updates` OTA. Built for low-end Android in the field — offline-first, one-handed, no clutter.

See also: [../ARCHITECTURE.md](../ARCHITECTURE.md) · [../FEATURES.md](../FEATURES.md) · [../reference/UPCHECK_DESIGN_SYSTEM.md](../reference/UPCHECK_DESIGN_SYSTEM.md) · [i18n guide](./i18n.md).

---

## Project layout

Everything lives under `frontend/src/`:

| Dir | What's in it |
|-----|--------------|
| `screens/` | One folder per feature (`auth/`, `farms/`, `ponds/`, `cycles/`, `logs/`, `calculators/`, `engines/`, `finance/`, `settings/`, `main/`, …). Screens are the routable units. |
| `components/ui/` | The shared UI kit — `Button`, `Card`, `Input`, `Stepper`, `ChipGroup`, `SelectField`, `NumberField`, `EmptyState`, `ErrorState`, `Skeleton`, `StatusBadge`, `FAB`, `ToastHost`, `OfflineIndicator`, … |
| `components/layout/` | `ScreenWrapper` and other structural wrappers. |
| `store/` | `zustand` stores (see [State](#state)). |
| `api/` | One axios module per backend resource, all sharing `api/client.ts`. |
| `sync/` | `recordSync.ts` — the offline write queue. |
| `hooks/` | `usePermissions.ts`, `useGoogleAuth.ts`. |
| `permissions/` | `capabilities.ts` — the RBAC matrix mirror. |
| `config/` | `features.ts` — feature flags. |
| `i18n/` | i18next setup + `locales/<lang>/<namespace>.ts` (see [i18n guide](./i18n.md)). |
| `navigation/` | `RootNavigator.tsx`, `MainNavigator.tsx`. |
| `theme/` | Design tokens (`tokens`, `spacing`, `radius`, `shadows`, `typography`, `colorRoles`, `gradients`) aggregated by `theme/index.ts`. |

App entry is `App.tsx` → `NavigationContainer` → `RootNavigator`, with `ErrorBoundary`, `SafeAreaProvider`, and a global `ToastHost`. `src/i18n` is imported first so translations are ready before any screen renders.

---

## Navigation

Two layers, both from `@react-navigation`.

### `RootNavigator` — the auth gate

A native-stack navigator whose screen set is chosen by auth state:

```ts
const { isLoading, isAuthenticated, pendingFarmSetup, initialize } = useAuthStore();
useEffect(() => { initialize(); }, []);          // restore session on launch
if (isLoading) return <ActivityIndicator/>;      // splash while checking stored token
```

- `initialize()` tries to restore a session from the persisted refresh token. Until it resolves, `isLoading` shows a splash spinner.
- `!isAuthenticated` → the **auth stack** only (`Login`, `Register`, `OtpLogin`, `TruecallerLogin`, `ForgotPassword`, plus `PrivacyPolicy`/`Terms` reachable from the register consent line).
- Authenticated → the **main stack**: `MainApp` (the tab navigator) plus every detail/log/engine/settings screen, pushed on top of the tabs.
- The stack is switched by *conditionally rendering* the two `<Stack.Screen>` groups — there is no manual `navigate('Login')` on logout; clearing the session re-renders into the auth group.

The full route table and every route's params live in `RootStackParamList` in `RootNavigator.tsx` — this is the source of truth for navigation typing. Most log/engine routes take `{ pondId, pondName?, cropId? }`.

**Deep linking** (`App.tsx`): scheme `upcheckapp://`, currently mapping `upcheckapp://reset-password` → `ResetPassword` (the password-reset email).

**Owner first-run farm-setup gate**: on sign-up, `authStore` sets `pendingFarmSetup = accountType === 'owner'`. `RootNavigator` reads it to pick the initial route so a brand-new owner lands on `CreateFarm` before anything else:

```ts
initialRouteName={isAuthenticated && pendingFarmSetup ? 'CreateFarm' : undefined}
```

`completeFarmSetup()` clears the flag once the first farm exists; the flag is persisted, so a mid-setup app kill still resumes on `CreateFarm`.

### `MainNavigator` — the 5-slot bottom tab

A bottom-tab navigator with a fixed 5-slot layout: **Home · Farms · QuickLog(+) · Reports · More**.

- The center slot is **not a tab**. Its screen is a `NoopScreen`, `tabPress` is `preventDefault()`ed, and `tabBarButton` renders a custom elevated gradient FAB that does `navigation.navigate('QuickLog')` (a modal on the root stack).
- The FAB is hidden for read-only viewers: `if (perms.role && !perms.canRecordData) return <View pointerEvents="none"/>`. When no farm context is resolved yet (`role === null`) it stays visible; the Quick Log screen and backend still guard writes.
- Tab icons are `MaterialCommunityIcons` (`view-dashboard`, `barn`, `chart-box`, `menu`); labels come from `t('common.tab*')`.

### The dynamic tile-config pattern

Hub screens (QuickLog, MoreScreen, PondDashboard, CalculatorHub, EnginesHub) don't hard-wire buttons — they hold a **local array of action tiles** and render them in a grid, each navigating by its `route` string. Example from `QuickLogScreen.tsx`:

```ts
type Action = { route: string; labelKey: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tint: string };

const ACTIONS: Action[] = [
  { route: 'WaterQualityLog', labelKey: 'ponds.actionWaterQuality', icon: 'water-percent', tint: '#2196F3' },
  { route: 'FeedLog',         labelKey: 'ponds.actionFeed',         icon: 'corn',          tint: '#FF9800' },
  // …
];

const go = (route: string) =>
  navigation.navigate(route, { pondId: selected.id, pondName: pondLabel(selected), cropId: selected.activeCycleId ?? undefined });
```

To add a tile: push one entry onto the array (`route` must exist in `RootStackParamList`, `labelKey` in i18n). No JSX changes. Some hubs name the field `logRoute` instead of `route`; the shape is otherwise identical — an array of `{ route/logRoute, labelKey, icon }` mapped to `navigation.navigate(...)`.

---

## State

`zustand` stores in `store/`. Read with the hook (`useX(s => s.field)`); mutate from outside React with `useX.getState()`.

| Store | Holds | Persisted? |
|-------|-------|-----------|
| `authStore` | Session/user, `status`, `accessToken`, `isAuthenticated`, `pendingFarmSetup`, all auth actions. | `expo-secure-store`, **partialized** to `refreshToken` + `userId`/`userEmail` + pending flags (SecureStore has a 2 KB limit — never persist the full session). |
| `membershipStore` | The user's farm memberships (`MyMembership[]`) and `roleForFarm(farmId)`. Loaded on auth, reset on logout. | No (fetched fresh). |
| `activeFarmStore` | Active `selectedFarm` / `selectedPond` / `activeCycle` and the derived `currentDOC` (day-of-cycle). | No. |
| `syncStore` | Offline write queue, `isConnected`, `failedOperations`, `drainQueue`. | AsyncStorage (queue only; `isConnected` is runtime). |
| `uiStore` | Toasts (`showToast`) and network-online flag. | No. |
| `notificationStore`, `uploadStore`, `calculatorStore` | Feature-local state. | Varies. |

### Session lifecycle

- `setSession(session)` derives `accessToken`, maps the Supabase user, flips `isAuthenticated`/`status`, and is the single place a live session is set (login, signup, refresh, OAuth all funnel through it).
- `initialize()` runs on launch: if a persisted `refreshToken` exists it calls `authApi.refresh` and re-`setSession`; otherwise → `unauthenticated`.
- `clearSession()` wipes everything (also clears Truecaller cache in `logout()`); re-renders `RootNavigator` into the auth stack.
- On becoming authenticated, `RootNavigator` calls `membershipStore.load()` so `usePermissions()` resolves on every screen.

---

## Data fetching

All HTTP goes through `api/client.ts` — a single axios instance shared by every `api/*.ts` module:

```ts
const API_URL = Constants.expoConfig?.extra?.apiBaseUrl   // → https://api.upcheck.in/api
  || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
```

`extra.apiBaseUrl` is set in `app.config.ts` (defaults to `https://api.upcheck.in/api`; override with `EXPO_PUBLIC_API_BASE_URL`).

- **Request interceptor** injects `Authorization: Bearer <accessToken>` from `authStore` (lazy-required to avoid a require cycle).
- **Response interceptor** handles `401` by refreshing once via `/auth/supabase/refresh`, replaying the original request, and queueing concurrent 401s behind one refresh; a failed refresh calls `clearSession()`. Network/timeout errors are rewritten to the friendly `common.networkError` string.

Each resource module exports typed functions and interfaces, e.g. `api/ponds.ts` → `pondsApi.getMine()` returning `{ data: Pond[] }`. Add a new endpoint by adding a function to the relevant `api/*.ts`, importing `apiClient` — never construct a second axios instance.

---

## Offline-first write queue

`sync/recordSync.ts` is the shared save path for operational records (feed, water quality, sampling, mortality, treatments, …). It makes every write survive a dropped connection.

```ts
const res = await saveRecord({ entity: 'water_quality', endpoint: '/water-quality', payload });
// res.queued === true  → stored locally, will sync later
// res.queued === false → sent to the server now (res.data has the response)
```

Behavior:

- Each record gets a client-minted UUID (`Crypto.randomUUID()`) stamped as `id`. The backend does insert-or-ignore on that id, so a replay/double-drain is **idempotent** — never a duplicate.
- **Offline** (`syncStore.isConnected === false`) → enqueue immediately, return `{ queued: true }` optimistically.
- **Online** → `POST` immediately. On a *network* error (no `response`) → enqueue and return `{ queued: true }`. On a real server rejection (4xx/5xx **with** a response — validation, permission, conflict) → **throw**, because the user must see it.
- `drainRecordQueue()` flushes the queue; it's wired to reconnect and app-start in `OfflineIndicator.tsx` via a `NetInfo` listener (`setConnected` + drain on regain). On drain, 2xx and 4xx ops are removed (4xx = permanent/duplicate); network/5xx are kept for the next reconnect.

### Making a new log form offline-safe

1. In the screen's save handler, call `saveRecord({ entity, endpoint, payload })` instead of `apiClient.post` directly.
2. Toast off `res.queued` so the farmer gets honest feedback:
   ```ts
   showToast({ message: res.queued ? t('common.savedOffline') : t('common.savedSuccess'), type: 'success' });
   navigation.goBack();
   ```
3. Wrap in `try/catch` and surface thrown (server-rejection) errors via `Alert`/`ErrorState`.
4. Nothing else — the queue, idempotency id, and reconnect drain are handled for you. `OfflineIndicator` already shows the pending count.

---

## Permissions / RBAC in the UI

`usePermissions(farmId?)` (defaults to the active farm) returns boolean capability flags resolved from the user's role on that farm:

```ts
const perms = usePermissions();
if (perms.canRecordData) { /* show the log button */ }
if (perms.canOwnerActions) { /* show delete-farm */ }
```

- The matrix lives in `permissions/capabilities.ts` — a **mirror of the backend** `farm-capability.ts` (`READ`, `WRITE_OPERATIONAL`, `WRITE_MANAGEMENT`, `VIEW_FINANCIALS`, `MANAGE_WORKERS`, `OWNER_ONLY` mapped to roles owner/manager/worker/viewer). Keep the two in sync; the backend + RLS are the real enforcement — **UI checks only hide, they never secure**. Prefer hiding an action over merely disabling it.
- `usePermissions` also exposes semantic aliases (`canCreatePond`, `canStartCycle`, `canInviteMember`, …) so call sites read as intent.

**Feature flags** (`config/features.ts`): `isFeatureEnabled('costManagement')` gates whole features. In-app features flip on when finished + device-tested; the four external-dependency features (`marketplaceCheckout`, `iotSensors`, `traceabilityPublic`, `expertConsultation`) stay **off** at launch.

---

## UI kit & design

Compose screens from `components/ui/` — don't hand-roll `View`+`Text`. Key pieces: `Button`, `Card`, `Input`, `NumberField`, `Stepper` (large ±  count control, no keyboard), `ChipGroup`, `SelectField`, `EmptyState`, `ErrorState`, `Skeleton`, `StatusBadge`/`SeverityPill`, `FAB`.

Style from **theme tokens only** (`theme/index.ts`): `theme.spacing`, `theme.radius`, `theme.shadows`, `theme.typeScale`, `theme.roles.light.*` (semantic colors), `theme.gradients`. No literal hex/px in styles except the per-tile `tint` accents in hub configs.

Hard rules (see [../reference/UPCHECK_DESIGN_SYSTEM.md](../reference/UPCHECK_DESIGN_SYSTEM.md) for the full reference):

- **No emojis in UI.** Icons are **`MaterialCommunityIcons`** (`@expo/vector-icons`) only.
- Touch targets ≥ 48 dp, always an `accessibilityLabel`.
- All user-facing text through `t(...)` — never a hard-coded English string.
- Keep numeric/unit tokens (`kg`, `pH`, `FCR`) verbatim across locales.

---

## Local dev

```bash
cd frontend
npm install
npm start            # Expo dev server (Metro) — scan the QR with Expo Go / a dev build
# npm run android    # build+run on a connected device / emulator
# npm run ios
npm test             # Jest (jest-expo) — e.g. sync/__tests__/recordSync.test.ts
```

- API base defaults to prod (`https://api.upcheck.in/api`); point at a local backend with `EXPO_PUBLIC_API_BASE_URL` (and the other `EXPO_PUBLIC_*` keys in `app.config.ts`).
- Truecaller login and push need a **dev build** (native modules) — they no-op in plain Expo Go.
- OTA: `runtimeVersion` is `1.0.0` and `updates.url` points at EAS Update — JS-only changes ship via `expo-updates` without a store release; native/config changes need a new build.
