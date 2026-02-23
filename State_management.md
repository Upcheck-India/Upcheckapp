# Shrimp Aquaculture App — State Management & State Flow Specification

> **Scope:** Complete specification for all client-side state: what lives where, how it flows between layers, how stores are structured, how server state is cached and synchronized, and how offline state is reconciled. Includes TypeScript type definitions, Zustand store implementations, TanStack Query patterns, and state transition diagrams for every major feature.

---

## Table of Contents

1. [State Architecture Overview](#1-state-architecture-overview)
2. [State Layers & Responsibilities](#2-state-layers--responsibilities)
3. [Global Zustand Stores](#3-global-zustand-stores)
4. [TanStack Query — Server State](#4-tanstack-query--server-state)
5. [Local / Form State](#5-local--form-state)
6. [Offline State & Sync Queue](#6-offline-state--sync-queue)
7. [State Flow: Authentication](#7-state-flow-authentication)
8. [State Flow: Farm & Pond Management](#8-state-flow-farm--pond-management)
9. [State Flow: Cycle Lifecycle](#9-state-flow-cycle-lifecycle)
10. [State Flow: Daily Logging](#10-state-flow-daily-logging)
11. [State Flow: Calculators](#11-state-flow-calculators)
12. [State Flow: Simulation](#12-state-flow-simulation)
13. [State Flow: Notifications](#13-state-flow-notifications)
14. [State Flow: Media / Photo Uploads](#14-state-flow-media--photo-uploads)
15. [State Persistence Strategy](#15-state-persistence-strategy)
16. [Cross-Store Communication Patterns](#16-cross-store-communication-patterns)
17. [Error State Handling](#17-error-state-handling)
18. [State Reset & Cleanup](#18-state-reset--cleanup)
19. [Derived State & Selectors](#19-derived-state--selectors)
20. [State Debugging & DevTools](#20-state-debugging--devtools)

---

## 1. State Architecture Overview

The app uses a **three-layer state model**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: Global Client State (Zustand)                             │
│  • Authentication (user session, JWT tokens)                        │
│  • Active context (selected farm, pond, cycle)                      │
│  • Notifications (unread count, list)                               │
│  • UI state (offline status, sync queue)                            │
│  • Calculator ephemeral inputs                                      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│  Layer 2: Server State Cache (TanStack Query)                       │
│  • All data fetched from the API (farms, ponds, cycles, logs)       │
│  • Automatic background refetching, stale-while-revalidate          │
│  • Optimistic updates for mutations                                 │
│  • Paginated list caching                                           │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│  Layer 3: Local / Ephemeral State (useState / useReducer / RHF)     │
│  • Form field values (React Hook Form)                              │
│  • UI toggles, modal visibility, tab selection                      │
│  • Scroll positions, animation states                               │
│  • In-progress photo uploads                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Decision Rule: Where Does State Live?

| State Type | Layer | Rationale |
|---|---|---|
| JWT access token, user identity | Zustand + SecureStore | Needs persistence, global access |
| Currently selected pond/cycle | Zustand | Needed across many screens |
| List of ponds | TanStack Query | Server-owned, cached, refetchable |
| Individual log entries | TanStack Query | Server-owned data |
| Form inputs | React Hook Form | Ephemeral, local to screen |
| Modal open/closed | useState | Component-local |
| Offline sync queue | Zustand + SQLite | Needs persistence across sessions |
| Calculator inputs | Zustand (session) | Preserved if user navigates away |
| Notification unread count | Zustand | Global badge count |
| Photo upload progress | Zustand (upload store) | Needs global visibility |

---

## 2. State Layers & Responsibilities

### 2.1 Zustand Stores (Global Client State)

| Store | File | Purpose |
|---|---|---|
| `authStore` | `store/authStore.ts` | User session, tokens, auth status |
| `activeFarmStore` | `store/activeFarmStore.ts` | Selected farm, pond, cycle context |
| `notificationStore` | `store/notificationStore.ts` | In-app notifications, unread count |
| `syncStore` | `store/syncStore.ts` | Offline queue, sync status |
| `uploadStore` | `store/uploadStore.ts` | Photo upload jobs, progress |
| `calculatorStore` | `store/calculatorStore.ts` | Preserved calculator inputs |
| `uiStore` | `store/uiStore.ts` | Global UI: network status, toasts |

### 2.2 TanStack Query (Server State)

Manages all data that comes from the API. Key principles:
- **Never duplicates** data already in a Zustand store.
- Uses **optimistic updates** for fast UI feedback on mutations.
- Automatically **invalidates** related queries after mutations.
- **Deduplicates** concurrent identical requests.

### 2.3 React Hook Form (Form State)

- Each form screen has its own RHF instance scoped to that component.
- Form state never persists in global stores.
- On successful submit, form is reset; data is reflected via TanStack Query cache update.
- Validation schemas defined with Zod and passed to RHF via `zodResolver`.

---

## 3. Global Zustand Stores

### 3.1 Auth Store

```ts
// store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: 'farmer' | 'admin' | 'viewer';
}

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;   // true during initial token hydration

  // Actions
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (partial: Partial<User>) => void;
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setSession: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false }),

      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : null })),

      setAccessToken: (token) =>
        set({ accessToken: token }),

      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      })),
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        // accessToken NOT persisted — always refreshed on app launch
      }),
    }
  )
);
```

---

### 3.2 Active Farm / Context Store

Tracks which farm, pond, and cycle the user is currently working in. Used to auto-fill context in forms and calculators.

```ts
// store/activeFarmStore.ts
import { create } from 'zustand';

interface PondSummary {
  id: string;
  name: string;
  shape: 'square' | 'circle';
  areaMz: number;
  status: 'idle' | 'active' | 'harvested';
}

interface CycleSummary {
  id: string;
  stockingDate: string;
  initialAgeDays: number;
  totalSeed: number;
  species: string;
  feedPricePerKg?: number;
  targetSurvivalRate?: number;
  targetSizeG?: number;
  status: 'active' | 'completed' | 'aborted';
}

interface FarmSummary {
  id: string;
  name: string;
  location?: string;
}

interface ActiveFarmState {
  // State
  selectedFarm: FarmSummary | null;
  selectedPond: PondSummary | null;
  activeCycle: CycleSummary | null;
  currentDOC: number | null;  // computed, updated daily

  // Actions
  setSelectedFarm: (farm: FarmSummary | null) => void;
  setSelectedPond: (pond: PondSummary | null) => void;
  setActiveCycle: (cycle: CycleSummary | null) => void;
  updateCurrentDOC: () => void;
  clearPondContext: () => void;
  clearAll: () => void;
}

const computeDOC = (stockingDate: string, initialAgeDays: number): number => {
  const stocking = new Date(stockingDate);
  const today = new Date();
  const daysSinceStocking = Math.floor(
    (today.getTime() - stocking.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceStocking + initialAgeDays;
};

export const useActiveFarmStore = create<ActiveFarmState>()((set, get) => ({
  selectedFarm: null,
  selectedPond: null,
  activeCycle: null,
  currentDOC: null,

  setSelectedFarm: (farm) => set({ selectedFarm: farm }),

  setSelectedPond: (pond) => set({ selectedPond: pond }),

  setActiveCycle: (cycle) => {
    const doc = cycle
      ? computeDOC(cycle.stockingDate, cycle.initialAgeDays)
      : null;
    set({ activeCycle: cycle, currentDOC: doc });
  },

  updateCurrentDOC: () => {
    const { activeCycle } = get();
    if (!activeCycle) return;
    set({ currentDOC: computeDOC(activeCycle.stockingDate, activeCycle.initialAgeDays) });
  },

  clearPondContext: () =>
    set({ selectedPond: null, activeCycle: null, currentDOC: null }),

  clearAll: () =>
    set({ selectedFarm: null, selectedPond: null, activeCycle: null, currentDOC: null }),
}));
```

---

### 3.3 Notification Store

```ts
// store/notificationStore.ts
import { create } from 'zustand';

export type NotificationLevel = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  cycleId?: string;
  pondName?: string;
  type: string;
  level: NotificationLevel;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  navigateTo?: string;  // route to navigate on tap
  navigateParams?: Record<string, string>;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  unreadCriticalCount: number;

  // Actions
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  unreadCriticalCount: 0,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    const unreadCriticalCount = notifications.filter(
      (n) => !n.isRead && n.level === 'critical'
    ).length;
    set({ notifications, unreadCount, unreadCriticalCount });
  },

  addNotification: (notification) => {
    const { notifications } = get();
    const updated = [notification, ...notifications];
    get().setNotifications(updated);
  },

  markAsRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    get().setNotifications(updated);
  },

  markAllAsRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadCount: 0, unreadCriticalCount: 0 });
  },

  removeNotification: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    get().setNotifications(updated);
  },

  clearAll: () =>
    set({ notifications: [], unreadCount: 0, unreadCriticalCount: 0 }),
}));
```

---

### 3.4 Sync Store (Offline Queue)

```ts
// store/syncStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncStatus = 'online' | 'offline' | 'syncing';

export type QueuedOperation = {
  id: string;                   // UUID for idempotency
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;               // e.g., 'water_quality', 'feed_log'
  endpoint: string;             // API path
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: Record<string, unknown>;
  localId?: string;             // temporary client ID before server assigns UUID
  retryCount: number;
  createdAt: string;
};

interface SyncState {
  status: SyncStatus;
  queue: QueuedOperation[];
  lastSyncedAt: string | null;
  failedOperations: QueuedOperation[];

  // Actions
  setStatus: (status: SyncStatus) => void;
  enqueue: (operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'createdAt'>) => void;
  dequeue: (id: string) => void;
  markFailed: (id: string) => void;
  retryFailed: () => void;
  clearQueue: () => void;
  setLastSyncedAt: (time: string) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      status: 'online',
      queue: [],
      lastSyncedAt: null,
      failedOperations: [],

      setStatus: (status) => set({ status }),

      enqueue: (operation) => {
        const newOp: QueuedOperation = {
          ...operation,
          id: crypto.randomUUID(),
          retryCount: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ queue: [...state.queue, newOp] }));
      },

      dequeue: (id) =>
        set((state) => ({ queue: state.queue.filter((op) => op.id !== id) })),

      markFailed: (id) => {
        const op = get().queue.find((o) => o.id === id);
        if (!op) return;
        set((state) => ({
          queue: state.queue.filter((o) => o.id !== id),
          failedOperations: [...state.failedOperations, { ...op, retryCount: op.retryCount + 1 }],
        }));
      },

      retryFailed: () =>
        set((state) => ({
          queue: [...state.queue, ...state.failedOperations],
          failedOperations: [],
        })),

      clearQueue: () => set({ queue: [], failedOperations: [] }),

      setLastSyncedAt: (time) => set({ lastSyncedAt: time }),
    }),
    {
      name: 'sync-queue-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

### 3.5 Upload Store (Photo Jobs)

```ts
// store/uploadStore.ts
import { create } from 'zustand';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface UploadJob {
  id: string;            // UUID
  localUri: string;      // device file path
  remoteUrl?: string;    // filled on success
  entityType: string;    // 'sampling', 'mortality', 'treatment', etc.
  entityLocalId: string; // the log record this photo belongs to
  progress: number;      // 0–100
  status: UploadStatus;
  error?: string;
}

interface UploadState {
  jobs: UploadJob[];

  addJob: (job: Omit<UploadJob, 'id' | 'progress' | 'status'>) => string;
  updateProgress: (id: string, progress: number) => void;
  completeJob: (id: string, remoteUrl: string) => void;
  failJob: (id: string, error: string) => void;
  retryJob: (id: string) => void;
  removeJob: (id: string) => void;
  pendingCount: () => number;
}

export const useUploadStore = create<UploadState>()((set, get) => ({
  jobs: [],

  addJob: (job) => {
    const id = crypto.randomUUID();
    set((state) => ({
      jobs: [
        ...state.jobs,
        { ...job, id, progress: 0, status: 'pending' },
      ],
    }));
    return id;
  },

  updateProgress: (id, progress) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, progress, status: 'uploading' } : j
      ),
    })),

  completeJob: (id, remoteUrl) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, remoteUrl, progress: 100, status: 'completed' } : j
      ),
    })),

  failJob: (id, error) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, status: 'failed', error } : j
      ),
    })),

  retryJob: (id) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, status: 'pending', progress: 0, error: undefined } : j
      ),
    })),

  removeJob: (id) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

  pendingCount: () =>
    get().jobs.filter((j) => j.status === 'pending' || j.status === 'uploading').length,
}));
```

---

### 3.6 Calculator Store

Preserves calculator inputs when user navigates away and returns.

```ts
// store/calculatorStore.ts
import { create } from 'zustand';

interface CultivationPerfInputs {
  totalSeed?: number;
  totalFeedKg?: number;
  currentMbwG?: number;
  totalMortality?: number;
  totalHarvestedKg?: number;
  totalHarvestedCount?: number;
  sourceMode: 'manual' | 'cycle';
  selectedCycleId?: string;
}

interface DailyFeedInputs {
  initialStocking?: number;
  abwG?: number;
  feedingRatePct?: number;
  survivalRatePct?: number;
}

interface ProductAmountInputs {
  pondAreaM2?: number;
  waterHeightM?: number;
  targetPpm?: number;
  productForm: 'granular' | 'liquid';
  productDensity: number;
  selectedPondId?: string;
}

interface FreeAmmoniaInputs {
  temperatureC?: number;
  ph?: number;
  tanMgL?: number;
}

interface CalculatorState {
  cultivationPerf: CultivationPerfInputs;
  dailyFeed: DailyFeedInputs;
  productAmount: ProductAmountInputs;
  freeAmmonia: FreeAmmoniaInputs;

  setCultivationPerf: (inputs: Partial<CultivationPerfInputs>) => void;
  setDailyFeed: (inputs: Partial<DailyFeedInputs>) => void;
  setProductAmount: (inputs: Partial<ProductAmountInputs>) => void;
  setFreeAmmonia: (inputs: Partial<FreeAmmoniaInputs>) => void;
  resetAll: () => void;
}

const defaultProductAmount: ProductAmountInputs = {
  productForm: 'granular',
  productDensity: 1.0,
};

export const useCalculatorStore = create<CalculatorState>()((set) => ({
  cultivationPerf: { sourceMode: 'manual' },
  dailyFeed: {},
  productAmount: defaultProductAmount,
  freeAmmonia: {},

  setCultivationPerf: (inputs) =>
    set((s) => ({ cultivationPerf: { ...s.cultivationPerf, ...inputs } })),

  setDailyFeed: (inputs) =>
    set((s) => ({ dailyFeed: { ...s.dailyFeed, ...inputs } })),

  setProductAmount: (inputs) =>
    set((s) => ({ productAmount: { ...s.productAmount, ...inputs } })),

  setFreeAmmonia: (inputs) =>
    set((s) => ({ freeAmmonia: { ...s.freeAmmonia, ...inputs } })),

  resetAll: () =>
    set({
      cultivationPerf: { sourceMode: 'manual' },
      dailyFeed: {},
      productAmount: defaultProductAmount,
      freeAmmonia: {},
    }),
}));
```

---

### 3.7 UI Store

```ts
// store/uiStore.ts
import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface UIState {
  isNetworkOnline: boolean;
  toasts: Toast[];

  setNetworkOnline: (online: boolean) => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  isNetworkOnline: true,
  toasts: [],

  setNetworkOnline: (isNetworkOnline) => set({ isNetworkOnline }),

  showToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    const duration = toast.duration ?? 3000;
    setTimeout(() => get().dismissToast(id), duration);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
```

---

## 4. TanStack Query — Server State

### 4.1 Query Client Configuration

```ts
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes — data considered fresh
      gcTime:    30 * 60 * 1000,      // 30 minutes — keep in cache even if unused
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false;  // don't retry auth errors
        if (error?.response?.status === 404) return false;  // don't retry not-found
        return failureCount < 3;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

---

### 4.2 Query Hooks Pattern

All queries follow this pattern — organized by domain:

```ts
// hooks/queries/usePonds.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { pondsApi } from '@/api/ponds';
import type { Pond, CreatePondDto } from '@/types/models';

// LIST
export const usePonds = (farmId: string) =>
  useQuery({
    queryKey: queryKeys.ponds(farmId),
    queryFn: () => pondsApi.list(farmId),
    enabled: !!farmId,
  });

// SINGLE
export const usePond = (pondId: string) =>
  useQuery({
    queryKey: queryKeys.pond(pondId),
    queryFn: () => pondsApi.get(pondId),
    enabled: !!pondId,
  });

// CREATE
export const useCreatePond = (farmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePondDto) => pondsApi.create(farmId, data),
    onSuccess: (newPond) => {
      // Optimistically insert into list cache
      qc.setQueryData<Pond[]>(queryKeys.ponds(farmId), (old = []) => [
        ...old,
        newPond,
      ]);
      // Populate individual cache entry
      qc.setQueryData(queryKeys.pond(newPond.id), newPond);
    },
  });
};

// UPDATE
export const useUpdatePond = (pondId: string, farmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreatePondDto>) => pondsApi.update(pondId, data),
    onMutate: async (data) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: queryKeys.pond(pondId) });
      const previous = qc.getQueryData<Pond>(queryKeys.pond(pondId));
      qc.setQueryData<Pond>(queryKeys.pond(pondId), (old) =>
        old ? { ...old, ...data } : old
      );
      return { previous };
    },
    onError: (_, __, ctx) => {
      // Rollback on error
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.pond(pondId), ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pond(pondId) });
      qc.invalidateQueries({ queryKey: queryKeys.ponds(farmId) });
    },
  });
};

// DELETE
export const useDeletePond = (farmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pondId: string) => pondsApi.delete(pondId),
    onSuccess: (_, pondId) => {
      qc.setQueryData<Pond[]>(queryKeys.ponds(farmId), (old = []) =>
        old.filter((p) => p.id !== pondId)
      );
      qc.removeQueries({ queryKey: queryKeys.pond(pondId) });
    },
  });
};
```

---

### 4.3 Key Query Hooks Reference

| Hook | Query Key | Stale Time | Notes |
|---|---|---|---|
| `useFarms()` | `['farms']` | 5 min | Refetches on app focus |
| `usePonds(farmId)` | `['farms', id, 'ponds']` | 5 min | |
| `useActiveCycle(pondId)` | `['ponds', id, 'cycles', 'active']` | 2 min | Short stale for DOC accuracy |
| `useWaterQualityLogs(cycleId)` | `['cycles', id, 'water-quality']` | 5 min | Paginated |
| `useFeedLogs(cycleId)` | `['cycles', id, 'feed']` | 5 min | |
| `useSamplingLogs(cycleId)` | `['cycles', id, 'sampling']` | 5 min | |
| `useHarvestLogs(cycleId)` | `['cycles', id, 'harvests']` | 5 min | |
| `useMortalityLogs(cycleId)` | `['cycles', id, 'mortality']` | 5 min | |
| `useDiseases()` | `['diseases']` | `Infinity` | Static seed data — never refetches |
| `useNotifications()` | `['notifications']` | 30 sec | Frequent polling for real-time feel |
| `useSimulation(id)` | `['simulations', id]` | 10 min | |
| `useSimulationResults(id)` | `['simulations', id, 'results']` | 10 min | |

---

### 4.4 Cache Invalidation Rules

After each mutation, the following queries must be invalidated:

| Mutation | Invalidates |
|---|---|
| Create / Update / Delete Pond | `ponds(farmId)` |
| Create Cycle | `cycles(pondId)`, `activeCycle(pondId)`, `pond(pondId)` |
| Complete / Abort Cycle | `cycles(pondId)`, `activeCycle(pondId)`, `pond(pondId)` |
| Create Water Quality Log | `waterQualityLogs(cycleId)` |
| Create Feed Log | `feedLogs(cycleId)` |
| Create Sampling Log | `samplingLogs(cycleId)` — also triggers `activeCycle(pondId)` refetch for latest MBW |
| Create Harvest Log (final) | `harvestLogs(cycleId)`, `cycles(pondId)`, `activeCycle(pondId)`, `pond(pondId)` |
| Create Mortality Log | `mortalityLogs(cycleId)` |
| Mark Notification Read | `notifications()` |

---

### 4.5 Optimistic Update Pattern

All create mutations on log entries use optimistic updates for instant UI feedback:

```ts
// hooks/queries/useWaterQualityLogs.ts
export const useCreateWaterQualityLog = (cycleId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWaterQualityDto) =>
      waterQualityApi.create(cycleId, data),

    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: queryKeys.waterQuality(cycleId) });
      const previous = qc.getQueryData(queryKeys.waterQuality(cycleId));

      // Inject optimistic record with temp ID
      const optimisticRecord = {
        ...data,
        id: `optimistic-${Date.now()}`,
        cycleId,
        createdAt: new Date().toISOString(),
      };

      qc.setQueryData<WaterQualityLog[]>(
        queryKeys.waterQuality(cycleId),
        (old = []) => [optimisticRecord, ...old]
      );

      return { previous };
    },

    onError: (_, __, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.waterQuality(cycleId), ctx.previous);
      }
    },

    onSettled: () => {
      // Always refetch to replace optimistic record with real server data
      qc.invalidateQueries({ queryKey: queryKeys.waterQuality(cycleId) });
    },
  });
};
```

---

## 5. Local / Form State

### 5.1 React Hook Form + Zod Pattern

Every form screen follows this structure:

```ts
// screens/logs/waterQuality/WaterQualityLogScreen.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WaterQualitySchema, type WaterQualityFormValues } from '@/schemas/waterQuality';

const WaterQualityLogScreen = () => {
  const { activeCycle } = useActiveFarmStore();
  const { mutate, isPending } = useCreateWaterQualityLog(activeCycle!.id);
  const { showToast } = useUIStore();

  const form = useForm<WaterQualityFormValues>({
    resolver: zodResolver(WaterQualitySchema),
    defaultValues: {
      logDate: new Date().toISOString().split('T')[0],
      timeOfDay: 'morning',
    },
    mode: 'onBlur',   // validate on blur
  });

  const onSubmit = (values: WaterQualityFormValues) => {
    mutate(values, {
      onSuccess: () => {
        showToast({ message: 'Water quality saved', type: 'success' });
        form.reset();
        navigation.goBack();
      },
      onError: (error) => {
        showToast({ message: 'Failed to save. Try again.', type: 'error' });
      },
    });
  };

  return (/* form JSX */);
};
```

### 5.2 Form State Lifecycle

```
[User Opens Form Screen]
       │
       ▼
[RHF initialized with defaultValues]
       │
       ▼
[User fills fields]
       │ (onBlur per field)
       ▼
[Field-level Zod validation runs]
       │
       ├─ Valid → field shows green / no error
       └─ Invalid → field shows error message
                    range check → shows RangeBanner
       │
       ▼
[User taps Submit]
       │
       ▼
[Full form Zod validation]
       │
       ├─ Invalid → scroll to first error, show form-level banner
       └─ Valid → check for critical range values
                  │
                  ├─ Critical values present → show ConfirmModal
                  │      User confirms → proceed to mutation
                  │      User cancels → stay on form
                  │
                  └─ No critical values → proceed to mutation
       │
       ▼
[Mutation fires (onMutate optimistic update)]
       │
       ├─ Success → reset form, show success toast, navigate back
       └─ Error → show error toast, form remains filled
```

---

## 6. Offline State & Sync Queue

### 6.1 Network Detection

```ts
// hooks/useNetworkMonitor.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useSyncStore } from '@/store/syncStore';
import { syncQueueProcessor } from '@/services/syncQueueProcessor';

export const useNetworkMonitor = () => {
  const { setNetworkOnline } = useUIStore();
  const { setStatus } = useSyncStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && !!state.isInternetReachable;
      setNetworkOnline(isOnline);
      setStatus(isOnline ? 'online' : 'offline');

      if (isOnline) {
        // Trigger sync queue processing when connectivity returns
        syncQueueProcessor.processAll();
      }
    });
    return unsubscribe;
  }, []);
};
```

### 6.2 Offline-Aware Mutation Hook

Wraps any mutation to support offline queuing:

```ts
// hooks/useOfflineMutation.ts
export const useOfflineMutation = <T extends Record<string, unknown>>(
  entityType: string,
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  onlineMutationFn: (payload: T) => Promise<unknown>,
  queryKeysToInvalidate: readonly unknown[][]
) => {
  const { isNetworkOnline } = useUIStore();
  const { enqueue } = useSyncStore();
  const qc = useQueryClient();

  return async (payload: T) => {
    if (isNetworkOnline) {
      // Normal online path
      return onlineMutationFn(payload);
    } else {
      // Offline path: enqueue and save locally
      enqueue({ type: 'CREATE', entity: entityType, endpoint, method, payload });

      // Write to local SQLite for immediate offline read
      await localDb.insert(entityType, { ...payload, _syncPending: true });

      // Manually update TanStack Query cache with local record
      // so the UI reflects the data immediately
      queryKeysToInvalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    }
  };
};
```

### 6.3 Sync Queue Processor

```ts
// services/syncQueueProcessor.ts
import { queryClient } from '@/lib/queryClient';
import { useSyncStore } from '@/store/syncStore';
import { apiClient } from '@/api/client';

class SyncQueueProcessor {
  private isRunning = false;

  async processAll() {
    if (this.isRunning) return;
    this.isRunning = true;

    const { queue, dequeue, markFailed, setStatus, setLastSyncedAt } =
      useSyncStore.getState();

    if (queue.length === 0) {
      this.isRunning = false;
      return;
    }

    setStatus('syncing');

    for (const operation of queue) {
      try {
        await apiClient.request({
          method: operation.method,
          url: operation.endpoint,
          data: operation.payload,
          headers: { 'Idempotency-Key': operation.id },
        });
        dequeue(operation.id);
      } catch (error: any) {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          // Client error — don't retry (bad data), just mark failed
          markFailed(operation.id);
        }
        // Network errors: leave in queue for next attempt
      }
    }

    setLastSyncedAt(new Date().toISOString());
    setStatus('online');
    this.isRunning = false;

    // Refetch all active queries to reflect synced data
    queryClient.invalidateQueries();
  }
}

export const syncQueueProcessor = new SyncQueueProcessor();
```

---

## 7. State Flow: Authentication

```
App Launch
    │
    ▼
[Check SecureStore for refreshToken]
    │
    ├─ Not found ──────────────────────────► [Show Login Screen]
    │                                               │
    │                                         User submits credentials
    │                                               │
    │                                         POST /auth/login
    │                                               │
    │                                         ┌─ Success ─┐
    │                                         │           │
    │                            authStore.setSession()   │
    │                            Navigate → Main App      │
    │                                         │           │
    │                                         └─ Error ──►│
    │                                           Show inline error
    │
    └─ Found ─────────────────────────────► POST /auth/refresh
                                                  │
                                          ┌─ Success ─┐
                                          │           │
                                  authStore.setAccessToken()
                                  authStore.setLoading(false)
                                  Navigate → Main App
                                          │
                                          └─ Error (401) ──►
                                            authStore.clearSession()
                                            Navigate → Login Screen

─────────────────────────────────────────────────────────
API 401 Response (Token Expired Mid-Session)
    │
    ▼
[Axios interceptor catches 401]
    │
    ▼
[POST /auth/refresh with refreshToken]
    │
    ├─ Success → authStore.setAccessToken(newToken) → retry original request
    └─ Error → authStore.clearSession() → navigate to Login

─────────────────────────────────────────────────────────
Logout
    │
    ▼
[POST /auth/logout] (fire and forget)
    │
    ▼
authStore.clearSession()
activeFarmStore.clearAll()
notificationStore.clearAll()
calculatorStore.resetAll()
queryClient.clear()      ← clears entire TanStack Query cache
Navigate → Login Screen
```

---

## 8. State Flow: Farm & Pond Management

```
FarmsListScreen mounts
    │
    ▼
useFarms() query fires
    │
    ├─ Loading → show SkeletonLoader
    ├─ Error → show ErrorState with retry button
    └─ Success → render FarmCard list

User taps Farm Card
    │
    ▼
activeFarmStore.setSelectedFarm(farm)
Navigate → FarmDetailScreen

─────────────────────────────────────────────────────────
FarmDetailScreen mounts
    │
    ▼
usePonds(farmId) query fires
    │
    └─ Success → render PondCard list

User taps Pond Card
    │
    ▼
activeFarmStore.setSelectedPond(pond)
Navigate → PondDashboard

─────────────────────────────────────────────────────────
Create Pond Flow
    │
    ▼
User taps "+ Add Pond"
Navigate → PondFormScreen (no params = create mode)
    │
    ▼
[RHF form initialized with empty defaults]
    │
    ▼
User fills form
[Shape toggle changes field visibility — local useState]
[Area preview updates via watch() on dimension fields]
    │
    ▼
User submits
    │
    ▼
useCreatePond.mutate(formValues)
    │
    ├─ onMutate: optimistically add pond to cache
    ├─ onError: rollback cache + show error toast
    └─ onSuccess:
          activeFarmStore.setSelectedPond(newPond)
          showToast('Pond created successfully')
          Navigate back to FarmDetail

─────────────────────────────────────────────────────────
Edit Pond Flow
    │
    ▼
Navigate → PondFormScreen (pondId param = edit mode)
    │
    ▼
usePond(pondId) populates form defaultValues
    │
    ▼
[Same form, same submit flow]
useUpdatePond.mutate(formValues)
    │
    └─ onSuccess: invalidate pond + ponds queries
                  show toast, navigate back
```

---

## 9. State Flow: Cycle Lifecycle

```
PondDashboard mounts
    │
    ▼
useActiveCycle(pondId) query fires
    │
    ├─ No active cycle → show "Start New Cycle" CTA
    └─ Active cycle found →
          activeFarmStore.setActiveCycle(cycle)
          activeFarmStore.updateCurrentDOC()
          Render dashboard metrics

─────────────────────────────────────────────────────────
Start New Cycle
    │
    ▼
[Guard check: useActiveCycle returns data?]
    ├─ Yes → show error modal: "Complete or abort existing cycle first"
    └─ No → Navigate → CycleFormScreen

[CycleFormScreen: RHF form]
User fills stocking details
    │
    ▼
useCreateCycle.mutate(formValues)
    │
    └─ onSuccess:
          activeFarmStore.setActiveCycle(newCycle)
          activeFarmStore.updateCurrentDOC()
          invalidate: cycles(pondId), activeCycle(pondId), pond(pondId)
          showToast('Cycle started!')
          Navigate → PondDashboard

─────────────────────────────────────────────────────────
DOC Auto-Update
    │
[AppState listener fires when app comes to foreground]
    │
    ▼
activeFarmStore.updateCurrentDOC()
    ↑ [also runs on every PondDashboard mount and via a daily background task]

─────────────────────────────────────────────────────────
Complete Cycle (Final Harvest triggers this)
    │
    ▼
HarvestLogScreen: user selects harvest_type = 'final'
ConfirmModal shown: "This will end the cycle"
    │
    ▼
useCreateHarvest.mutate({ ...harvestData, harvestType: 'final' })
    │
    └─ onSuccess:
          invalidate: harvestLogs, cycles, activeCycle, pond
          activeFarmStore.setActiveCycle(null)   ← clear active cycle
          activeFarmStore.setSelectedPond({
            ...selectedPond,
            status: 'idle'
          })
          showToast('Cycle completed. Great harvest!')
          Navigate → PondDashboard (now shows idle state)

─────────────────────────────────────────────────────────
Abort Cycle
    │
    ▼
User taps ⋮ menu → "Abort Cycle"
ConfirmModal: "Abort this cycle? Data will be preserved."
    │
    ▼
POST /cycles/:id/abort
    │
    └─ onSuccess:
          Same cleanup as Complete Cycle
          showToast('Cycle aborted')
```

---

## 10. State Flow: Daily Logging

All log entry flows share this common pattern. Here is the Water Quality flow as the canonical example, followed by exception notes for other log types.

### 10.1 Canonical Log Entry Flow

```
User taps Quick Action on Dashboard (e.g., "Water Quality")
    │
    ▼
Navigate → WaterQualityLogScreen
    │
    ▼
[Screen mounts]
    ├─ activeCycle from store → used for cycleId
    ├─ currentDOC from store → displayed in header
    ├─ RHF initialized: { logDate: today, timeOfDay: 'morning' }
    │
    ▼
[User fills fields]
    │
    ├─ onBlur per field → Zod validates
    │
    ├─ Range check fires (useRangeValidation hook):
    │     value within normal → green dot
    │     value in warning zone → yellow dot + RangeBanner
    │     value in critical zone → red dot + RangeBanner
    │
    ▼
[User taps Save]
    │
    ▼
[RHF handleSubmit]
    │
    ├─ Validation fails → scroll to first error
    │
    └─ Validation passes →
          [Check for critical values]
          │
          ├─ Critical values exist → show ConfirmModal
          │       User cancels → stay on form
          │       User confirms → proceed
          │
          └─ No critical values → proceed
                │
                ▼
          [Check network status]
                │
                ├─ Online → useCreateWaterQualityLog.mutate(values)
                │                │
                │                ├─ onMutate → optimistic cache insert
                │                ├─ onError → rollback + error toast
                │                └─ onSuccess →
                │                      check for out-of-range → generate notifications
                │                      showToast('Saved!')
                │                      navigate back
                │
                └─ Offline → enqueue to syncStore
                             write to local SQLite
                             update TanStack cache with local record
                             showToast('Saved offline — will sync when connected')
                             navigate back
```

### 10.2 Log-Specific State Notes

**Feed Log:**
- Local state `meals: Meal[]` (array of { amount, time }) managed with `useFieldArray` from RHF.
- `isFastingDay` boolean local state — when true, disables meals array entirely.
- `totalFeedKg` computed via `watch()` on all meal amounts, displayed live.

**Sampling Log:**
- `photos: UploadJob[]` state managed via `uploadStore`.
- On photo selected → `uploadStore.addJob()` → upload begins immediately in background while user finishes rest of form.
- On form submit → wait for any pending photo uploads to complete before finalizing the record.
- `dayOfCulture` auto-computed from `activeFarmStore.currentDOC` and displayed read-only.

**Harvest Log (Final):**
- Extra local state: `hasConfirmedFinal: boolean`.
- Final harvest guard: submit button disabled until `hasConfirmedFinal = true` (checkbox).
- On success → triggers full cycle completion state cascade (see Section 9).

**Mortality Log:**
- `estimatedTotal` computed via `watch()` on `estimatedCount` and `multiplier`, displayed live.

**Plankton Log:**
- All plankton count fields watched via `watch()` for live donut chart update.
- `totalCount` computed as sum of all non-null count fields.
- Dominant type derived from max value — used for alert checks.

---

## 11. State Flow: Calculators

Calculators are **stateless computations** — no server calls, no async. All calculation happens synchronously in pure utility functions.

```
User opens a Calculator screen (e.g., DailyFeedCalculator)
    │
    ▼
[Screen mounts]
    ├─ Read initial values from calculatorStore.dailyFeed
    ├─ If activeCycle exists → suggest pre-filling from cycle data
    │
    ▼
[Local useState for input values]
    OR
[Controlled by calculatorStore — values preserved on navigation]

User changes input field
    │
    ▼
[calculatorStore.setDailyFeed({ abwG: value })]
    │
    ▼
[Result derived synchronously using utils/calculators.ts]
    ↳ const result = calculateDailyFeed(inputs)    ← pure function
    ↳ Displayed immediately, no loading state needed

─────────────────────────────────────────────────────────
Cultivation Performance (sourceMode = 'cycle')
    │
    ▼
calculatorStore.setCultivationPerf({ sourceMode: 'cycle', selectedCycleId })
    │
    ▼
Fires useCyclePerformanceData(cycleId) query:
    Aggregates:
    ├─ totalSeed from cycles record
    ├─ SUM(totalFeedKg) from feed_logs
    ├─ latest MBW from sampling_logs
    └─ SUM(estimatedTotal) from mortality_logs
    │
    ▼
[Query returns → auto-fills input fields]
User can override any field manually
    │
    ▼
[Result computed synchronously]
[Color-coded vs cycle targets from activeCycle store]
```

---

## 12. State Flow: Simulation

```
SimulationListScreen
    │
    ▼
useSimulations() query → list of saved simulations

─────────────────────────────────────────────────────────
Create New Simulation
    │
    ▼
Navigate → SimulationFormScreen (no params)
[RHF form — no store backing, ephemeral]

User adds partial harvest rules
    ├─ useFieldArray({ control, name: 'partialHarvests' })
    ├─ Client-side validation: SUM(percentages) ≤ 100, DOCs ascending
    │
    ▼
User taps "Run Simulation"
    │
    ▼
[Full form validation]
    │
    ▼
POST /simulations (save inputs)
    │
    └─ onSuccess → POST /simulations/:id/run (generate results)
                         │
                         └─ onSuccess →
                               invalidate simulations()
                               Navigate → SimulationResultsScreen(id)

─────────────────────────────────────────────────────────
SimulationResultsScreen
    │
    ▼
useSimulation(id) → inputs/config
useSimulationResults(id) → rows (paginated by DOC week)
    │
    ├─ Loading → show SkeletonLoader for each table
    └─ Success → render Feed / Biomass / Harvest tabs

Local state:
    ├─ activeTab: 'feed' | 'biomass' | 'harvest'
    ├─ tableScrollPosition (preserved across tab switches via ref)
    └─ summaryExpanded: boolean

─────────────────────────────────────────────────────────
Edit & Re-run Simulation
    │
    ▼
Navigate → SimulationFormScreen(id)
useSimulation(id) populates form defaultValues
    │
    ▼
PUT /simulations/:id → update inputs
POST /simulations/:id/run → regenerate results
    │
    └─ onSuccess:
          invalidate simulationResults(id)
          Navigate back to ResultsScreen
          [Results screen refetches automatically]

─────────────────────────────────────────────────────────
Duplicate Simulation
    │
    ▼
POST /simulations (copy of inputs, new name "Copy of ...")
Navigate → SimulationFormScreen(newId) for user to edit
```

---

## 13. State Flow: Notifications

```
App launches (user authenticated)
    │
    ▼
useNotifications() query fires (polls every 30 seconds)
    │
    └─ onSuccess:
          notificationStore.setNotifications(data)
          [unreadCount and unreadCriticalCount auto-computed in store]
          [Badge on bottom tab and drawer item updates reactively]

─────────────────────────────────────────────────────────
New Notification Generated (server-side trigger)
    │
    ▼
e.g., Out-of-range water quality log saved
Server generates notification record
    │
    ▼
[Next poll cycle picks it up] OR [Push notification received]
    │
    ▼
If push notification:
    ├─ App in foreground → notificationStore.addNotification(data)
    │                       show in-app Toast banner
    └─ App in background / closed → OS shows push notification
                                    On tap → deep link to related screen

─────────────────────────────────────────────────────────
User taps Notification
    │
    ▼
notificationStore.markAsRead(id)
PATCH /notifications/:id/read (fire and forget)
    │
    ▼
Navigate to related screen (from notification.navigateTo)
    ├─ e.g., WaterQualityDetail (water quality alert)
    ├─ e.g., PondDashboard (mortality alert)
    └─ e.g., DiseaseLogDetail (disease alert)

─────────────────────────────────────────────────────────
User opens Notifications Screen
    │
    ▼
All unread notifications marked as read (bulk)
notificationStore.markAllAsRead()
POST /notifications/read-all (fire and forget)
```

---

## 14. State Flow: Media / Photo Uploads

```
User taps photo slot in PhotoGrid
    │
    ▼
[Action sheet: Camera | Gallery]
    │
    ▼
expo-image-picker returns localUri
    │
    ▼
[Client-side compression] (expo-image-manipulator)
max 1920px, JPEG quality 80
    │
    ▼
uploadStore.addJob({
    localUri,
    entityType: 'sampling',
    entityLocalId: form's tempId
})
→ returns jobId
    │
    ▼
PhotoGrid renders thumbnail immediately from localUri
Shows progress ring overlay (from uploadStore.jobs[jobId].progress)
    │
    ▼
[Upload service begins upload in background]
    │
    ├─ GET presigned URL from /media/presigned-url
    │
    ├─ PUT file to S3/Supabase using presigned URL
    │     → uploadStore.updateProgress(jobId, percentage)
    │
    ├─ Upload success:
    │     uploadStore.completeJob(jobId, remoteUrl)
    │     PhotoGrid shows checkmark, progress ring disappears
    │
    └─ Upload failure:
          uploadStore.failJob(jobId, errorMessage)
          PhotoGrid shows retry button
          User taps retry → uploadStore.retryJob(jobId) → retry upload

─────────────────────────────────────────────────────────
Form Submit with Photos
    │
    ▼
[Before submitting, check all photo jobs for this form]
    │
    ├─ All completed → submit with photos: [remoteUrl1, remoteUrl2]
    │
    ├─ Some still uploading → show "Waiting for uploads..." loading state
    │     [Wait for all pending uploads to resolve]
    │     [Use Promise.all on upload promises]
    │     Then submit
    │
    └─ Some failed → show warning:
          "1 photo failed to upload. Submit without it or retry."
          [Retry] → retry failed jobs → re-check on resolve
          [Submit Anyway] → submit with only successfully uploaded URLs

─────────────────────────────────────────────────────────
Offline Photo Handling
    │
    ▼
[Network offline when upload attempted]
    │
    ▼
uploadStore job status stays 'pending'
Log record saved locally with photos: [localUri] (not remoteUrl)
    │
    ▼
[Network returns]
syncStore processes queue → uploads photos
uploadStore.completeJob() → remoteUrl stored
PATCH /logs/:id to update photos array on server record
```

---

## 15. State Persistence Strategy

| Store | What's Persisted | Storage Engine | Why |
|---|---|---|---|
| `authStore` | `user`, `refreshToken` | expo-secure-store | Sensitive — encrypted storage |
| `syncStore` | `queue`, `failedOperations`, `lastSyncedAt` | AsyncStorage | Must survive app kills |
| `uploadStore` | Nothing — jobs are transient | Memory only | Restart uploads fresh on app relaunch |
| `activeFarmStore` | `selectedFarm`, `selectedPond` | AsyncStorage | Restore last context on return |
| `notificationStore` | Nothing | Memory only | Fetched fresh from API |
| `calculatorStore` | All inputs | AsyncStorage | Quality of life — preserve across sessions |
| `uiStore` | Nothing | Memory only | Transient UI state |

### TanStack Query Persistence (Optional)

For a richer offline experience, persist TanStack Query cache to AsyncStorage using `@tanstack/query-async-storage-persister`:

```ts
// lib/queryPersister.ts
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rq-cache',
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 24 * 60 * 60 * 1000,  // 24 hours max cache age
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist high-value queries
      const key = query.queryKey[0] as string;
      return ['farms', 'ponds', 'cycles', 'diseases'].includes(key);
    },
  },
});
```

---

## 16. Cross-Store Communication Patterns

Stores should NOT directly call each other. Use **event-driven patterns** or compose at the hook/service layer.

### Pattern 1: Composing in a Service Hook

```ts
// hooks/useCompleteHarvest.ts
// Orchestrates multiple stores + query invalidations in one place

export const useCompleteHarvest = () => {
  const { setActiveCycle, selectedPond, setSelectedPond } = useActiveFarmStore();
  const { showToast } = useUIStore();
  const qc = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: harvestApi.create,
    onSuccess: (data, variables) => {
      if (variables.harvestType === 'final') {
        // Update context store
        setActiveCycle(null);
        if (selectedPond) {
          setSelectedPond({ ...selectedPond, status: 'idle' });
        }
        // Invalidate server state
        qc.invalidateQueries({ queryKey: queryKeys.activeCycle(selectedPond!.id) });
        qc.invalidateQueries({ queryKey: queryKeys.pond(selectedPond!.id) });
        qc.invalidateQueries({ queryKey: queryKeys.ponds(/* farmId */ '') });
      }
      showToast({ message: 'Harvest logged successfully', type: 'success' });
    },
  });

  return { completeHarvest: mutate };
};
```

### Pattern 2: Reactive Store Subscriptions

When one store's state change should trigger behavior in another:

```ts
// Listening for network status change to trigger sync
// In a top-level component or app initializer:

useEffect(() => {
  const unsubscribe = useUIStore.subscribe(
    (state) => state.isNetworkOnline,
    (isOnline) => {
      if (isOnline) {
        syncQueueProcessor.processAll();
        queryClient.invalidateQueries(); // refresh stale data
      }
    }
  );
  return unsubscribe;
}, []);
```

### Pattern 3: Auth-Triggered Cleanup

Logout must clear ALL stores:

```ts
// services/authService.ts
export const logout = async () => {
  try {
    await authApi.logout();
  } catch { /* fire and forget */ }

  // Clear all state in correct order
  useAuthStore.getState().clearSession();
  useActiveFarmStore.getState().clearAll();
  useNotificationStore.getState().clearAll();
  useCalculatorStore.getState().resetAll();
  useSyncStore.getState().clearQueue();
  useUploadStore.getState().jobs   // cancel pending uploads if any
    .filter(j => j.status !== 'completed')
    .forEach(j => useUploadStore.getState().removeJob(j.id));

  queryClient.clear();
};
```

---

## 17. Error State Handling

### 17.1 Error State Types

| Type | Where Handled | User Sees |
|---|---|---|
| Network error (offline) | Axios interceptor + useSyncStore | Offline banner, queue for later |
| Auth error (401) | Axios interceptor | Auto-refresh token, or redirect to login |
| Validation error (400) | Mutation onError | Toast + keep form open with error |
| Not found (404) | Query/mutation onError | Toast "Not found" + navigate back |
| Server error (500) | Query/mutation onError | Toast "Something went wrong. Try again." |
| Query loading error | TanStack Query error state | ErrorState component with retry button |
| Form validation error | RHF + Zod | Inline field errors + form-level banner |
| Upload failure | uploadStore.failJob | Retry button on photo thumbnail |

### 17.2 Global Error Boundary

```ts
// components/GlobalErrorBoundary.tsx
// Catches unhandled JS errors, shows friendly error screen
// Includes "Report Bug" option (Sentry) and "Reload App" button
```

### 17.3 Query Error UI Pattern

```tsx
const { data, isLoading, isError, error, refetch } = usePonds(farmId);

if (isLoading) return <SkeletonLoader count={4} />;

if (isError) return (
  <ErrorState
    title="Couldn't load ponds"
    message="Check your connection and try again."
    onRetry={refetch}
  />
);
```

### 17.4 Mutation Error Recovery

All mutations should:
1. Rollback optimistic updates via `onError` context.
2. Show a toast with a human-readable error message.
3. Leave the form open so the user doesn't lose their input.
4. Log the error to Sentry (non-blocking, fire-and-forget).

---

## 18. State Reset & Cleanup

### 18.1 When to Reset What

| Event | Stores to Reset | Query Cache |
|---|---|---|
| Logout | ALL stores | `queryClient.clear()` |
| Select different farm | `activeFarmStore.clearPondContext()` | No full clear — queries will refetch |
| Cycle completed/aborted | `activeFarmStore.setActiveCycle(null)` | Invalidate cycle + pond queries |
| App comes to foreground | `activeFarmStore.updateCurrentDOC()` | `queryClient.invalidateQueries()` on stale |
| Pull-to-refresh (user action) | None | `refetch()` on relevant query |

### 18.2 AppState Lifecycle Hooks

```ts
// hooks/useAppStateManager.ts
import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';

export const useAppStateManager = () => {
  const appState = useRef(AppState.currentState);
  const { updateCurrentDOC } = useActiveFarmStore();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // App came to foreground
        updateCurrentDOC();
        queryClient.invalidateQueries();  // refresh any stale data
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);
};
```

---

## 19. Derived State & Selectors

Derived values are computed at the hook/selector level, never stored redundantly.

### 19.1 Selector Pattern with Zustand

```ts
// Prefer granular selectors to prevent unnecessary re-renders
const currentDOC = useActiveFarmStore((s) => s.currentDOC);
const activeCycle = useActiveFarmStore((s) => s.activeCycle);

// NOT this (re-renders on any store change):
const store = useActiveFarmStore(); // ❌
```

### 19.2 Computed Values Hook

```ts
// hooks/useCycleMetrics.ts
// Derives key cycle metrics from cached query data — no extra API calls

export const useCycleMetrics = (cycleId: string) => {
  const { activeCycle } = useActiveFarmStore();
  const { data: feedLogs } = useFeedLogs(cycleId);
  const { data: samplingLogs } = useSamplingLogs(cycleId);
  const { data: mortalityLogs } = useMortalityLogs(cycleId);
  const { data: harvestLogs } = useHarvestLogs(cycleId);

  return useMemo(() => {
    if (!activeCycle) return null;

    const totalSeed = activeCycle.totalSeed;
    const cumulativeFeedKg = feedLogs
      ?.filter((l) => !l.isFastingDay)
      .reduce((sum, l) => sum + (l.totalFeedKg ?? 0), 0) ?? 0;

    const latestMbwG = samplingLogs?.[0]?.mbwGrams ?? 0;

    const cumulativeMortality = mortalityLogs
      ?.reduce((sum, l) => sum + (l.estimatedTotal ?? 0), 0) ?? 0;

    const totalHarvestedKg = harvestLogs
      ?.reduce((sum, l) => sum + l.weightKg, 0) ?? 0;

    const totalHarvestedCount = harvestLogs
      ?.reduce((sum, l) => sum + (l.count ?? 0), 0) ?? 0;

    const estimatedPopulation = totalSeed - cumulativeMortality - totalHarvestedCount;
    const survivalRatePct = (estimatedPopulation / totalSeed) * 100;
    const biomassKg = (estimatedPopulation * latestMbwG) / 1000;
    const totalBiomassProduced = biomassKg + totalHarvestedKg;
    const fcr = totalBiomassProduced > 0
      ? cumulativeFeedKg / totalBiomassProduced
      : null;

    return {
      estimatedPopulation,
      survivalRatePct,
      biomassKg,
      fcr,
      cumulativeFeedKg,
      totalHarvestedKg,
      cumulativeMortality,
      cumulativeMortalityPct: (cumulativeMortality / totalSeed) * 100,
      latestMbwG,
    };
  }, [feedLogs, samplingLogs, mortalityLogs, harvestLogs, activeCycle]);
};
```

---

## 20. State Debugging & DevTools

### 20.1 Zustand DevTools

```ts
// Enable Zustand Redux DevTools middleware in development
import { devtools } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(/* ... */),
    { name: 'AuthStore', enabled: __DEV__ }
  )
);
```

### 20.2 TanStack Query DevTools

```tsx
// app/_layout.tsx — only renders in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

{__DEV__ && <ReactQueryDevtools initialIsOpen={false} />}
```

Note: TanStack Query DevTools are web-only. For React Native, use `@tanstack/query-devtools` with Flipper plugin or log with custom logger.

### 20.3 State Logger

```ts
// development utility — logs all store mutations
const storeLogger = (config) => (set, get, api) =>
  config(
    (...args) => {
      if (__DEV__) {
        console.group('State Update');
        console.log('Previous:', get());
        console.log('Action args:', args);
        set(...args);
        console.log('Next:', get());
        console.groupEnd();
      } else {
        set(...args);
      }
    },
    get,
    api
  );
```

### 20.4 Sentry Integration

```ts
// Monitor state-related crashes
import * as Sentry from 'sentry-expo';

// In mutation onError handlers:
onError: (error, variables, context) => {
  Sentry.Native.captureException(error, {
    tags: { area: 'water_quality_mutation' },
    extra: { variables, context },
  });
}
```

---

## Appendix A: Complete State Type Definitions

```ts
// types/models.ts — shared across all stores and queries

export interface Farm {
  id: string;
  userId: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  totalAreaM2?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pond {
  id: string;
  farmId: string;
  name: string;
  shape: 'square' | 'circle';
  length?: number;
  width?: number;
  diameter?: number;
  depth: number;
  areaM2: number;
  status: 'idle' | 'active' | 'harvested';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cycle {
  id: string;
  pondId: string;
  stockingDate: string;
  initialAgeDays: number;
  totalSeed: number;
  species: string;
  hatchery?: string;
  broodstock?: string;
  feedPricePerKg?: number;
  carryingCapacityKg?: number;
  targetSizeG?: number;
  targetSurvivalRate?: number;
  targetFcr?: number;
  targetDays?: number;
  status: 'active' | 'completed' | 'aborted';
  endDate?: string;
  createdAt: string;
}

export interface WaterQualityLog {
  id: string;
  cycleId: string;
  logDate: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  ph?: number;
  salinityppt?: number;
  temperatureC?: number;
  doMgL?: number;
  transparencyCm?: number;
  orpMv?: number;
  waterColor?: string;
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'overcast';
  conductivityMsCm?: number;
  turbidityNtu?: number;
  waterHeightCm?: number;
  notes?: string;
  createdAt: string;
}

export interface SamplingLog {
  id: string;
  cycleId: string;
  sampleDate: string;
  dayOfCulture: number;
  mbwGrams: number;
  sampleCount?: number;
  photos: string[];
  notes?: string;
  createdAt: string;
}

export interface HarvestLog {
  id: string;
  cycleId: string;
  harvestDate: string;
  harvestType: 'partial' | 'final';
  weightKg: number;
  count?: number;
  pricePerKg?: number;
  totalRevenue?: number;
  buyerName?: string;
  notes?: string;
  createdAt: string;
}

export interface MortalityLog {
  id: string;
  cycleId: string;
  mortalityDate: string;
  estimatedCount: number;
  multiplier: number;
  estimatedTotal: number;
  cause?: string;
  photos: string[];
  notes?: string;
  createdAt: string;
}

export interface Disease {
  id: string;
  code: string;
  commonName: string;
  fullName?: string;
  causativeAgent?: string;
  description?: string;
  signsSymptoms?: string;
  prevention?: string;
  treatmentNotes?: string;
  referenceImages: string[];
}

export interface SimulationRun {
  id: string;
  userId: string;
  name?: string;
  farmAreaM2: number;
  totalStocking: number;
  targetSurvivalRatePct: number;
  feedPricePerKg: number;
  marketPricePerKg: number;
  targetSizeG?: number;
  partialHarvests: { ageDays: number; percentage: number }[];
  createdAt: string;
}
```

---

## Appendix B: Query Key Reference

```ts
// constants/queryKeys.ts
export const queryKeys = {
  farms:              ()              => ['farms']                              as const,
  farm:               (id: string)   => ['farms', id]                         as const,
  ponds:              (farmId: string) => ['farms', farmId, 'ponds']           as const,
  pond:               (id: string)   => ['ponds', id]                         as const,
  cycles:             (pondId: string) => ['ponds', pondId, 'cycles']          as const,
  activeCycle:        (pondId: string) => ['ponds', pondId, 'cycles', 'active'] as const,
  cycle:              (id: string)   => ['cycles', id]                         as const,
  waterQuality:       (cycleId: string) => ['cycles', cycleId, 'water-quality'] as const,
  feedLogs:           (cycleId: string) => ['cycles', cycleId, 'feed']          as const,
  sampling:           (cycleId: string) => ['cycles', cycleId, 'sampling']      as const,
  treatments:         (cycleId: string) => ['cycles', cycleId, 'treatments']    as const,
  harvests:           (cycleId: string) => ['cycles', cycleId, 'harvests']      as const,
  mortality:          (cycleId: string) => ['cycles', cycleId, 'mortality']     as const,
  chemical:           (cycleId: string) => ['cycles', cycleId, 'chemical']      as const,
  plankton:           (cycleId: string) => ['cycles', cycleId, 'plankton']      as const,
  microbiology:       (cycleId: string) => ['cycles', cycleId, 'microbiology']  as const,
  diseaseLogs:        (cycleId: string) => ['cycles', cycleId, 'disease-logs']  as const,
  diseases:           ()              => ['diseases']                           as const,
  disease:            (id: string)   => ['diseases', id]                        as const,
  notifications:      ()              => ['notifications']                      as const,
  simulations:        ()              => ['simulations']                        as const,
  simulation:         (id: string)   => ['simulations', id]                    as const,
  simulationResults:  (id: string)   => ['simulations', id, 'results']         as const,
  cyclePerformance:   (cycleId: string) => ['cycles', cycleId, 'performance']   as const,
};
```

---

*End of State Management & State Flow Specification*
*Version 1.0 — Shrimp Aquaculture Management App*