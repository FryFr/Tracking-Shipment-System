# Webapp Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la webapp de tracking con sidebar (Buscar/Dashboard/Historial), un dashboard de envíos agrupado por orden, historial de búsquedas por usuario, estética dark-pro y diseño responsive.

**Architecture:** Se introduce `react-router-dom` con un `AppShell` (sidebar + `<Outlet>`). El Dashboard lee `trackings` en vivo (`onSnapshot`) y filtra/agrupa client-side. La lógica pura (agrupar, filtrar, ETA, historial) se aísla en utils testeadas con vitest; la UI se verifica con typecheck + chequeo visual. Se reutilizan `TrackingResult`, `Timeline`, `LogisticsETAForm`, `OrderLinkForm`, `ManualShipmentForm`.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind, Firebase (Firestore/Auth), react-router-dom, lucide-react, date-fns, vitest + @testing-library (solo lógica).

**Convención de verificación:** no hay test runner previo; se agrega vitest para lógica pura. UI: `npx tsc --noEmit` debe pasar + chequeo visual con `npm run dev`. NO ejecutar `npm run build` salvo el deploy final (regla del usuario). Commits frecuentes en la rama `feat/webapp-redesign`.

---

## File Structure

**Nuevos:**
- `src/router.tsx` — definición de rutas.
- `src/components/AppShell.tsx` — layout: sidebar/bottom-nav + `<Outlet>`.
- `src/components/Sidebar.tsx` — navegación (desktop sidebar + mobile bottom bar).
- `src/components/StatusChip.tsx` — chip de estado reutilizable.
- `src/views/SearchView.tsx` — buscador + resultados (extraído del App actual).
- `src/views/DashboardView.tsx` — tabla agrupada de envíos.
- `src/views/HistoryView.tsx` — búsquedas recientes.
- `src/components/ShipmentsTable.tsx` — tabla agrupada por orden + filas.
- `src/components/FiltersBar.tsx` — filtros del dashboard.
- `src/components/ShipmentDrawer.tsx` — drawer con el detalle (envuelve `TrackingResult`).
- `src/hooks/useAllTrackings.ts` — `onSnapshot` de `trackings`.
- `src/hooks/useSearchHistory.ts` — leer/guardar `users/{uid}/searches`.
- `src/utils/status.ts` — bucket/label/color de estado (lógica pura).
- `src/utils/dashboard.ts` — agrupar/filtrar/ordenar + ETA real (lógica pura).
- `src/utils/*.test.ts` — tests vitest de la lógica pura.
- `vitest.config.ts`.

**Modificados:**
- `src/App.tsx` — pasa a montar el router (deja de tener la UI inline).
- `src/main.tsx` — envuelve con `<BrowserRouter>` (o usa `RouterProvider`).
- `src/components/TrackingResult.tsx` — usa `StatusChip`; sin cambios de lógica.
- `src/components/Timeline.tsx` — usa `StatusChip`/colores compartidos (opcional, mínimo).
- `firestore.rules` — regla para `users/{uid}/searches`.
- `package.json` — deps + script `test`.

---

## Task 1: Rama, dependencias y tooling de test

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Crear rama de trabajo**

```bash
git checkout -b feat/webapp-redesign
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Agregar script de test en `package.json`**

En `"scripts"`, agregar: `"test": "vitest run"`.

- [ ] **Step 5: Verificar**

Run: `npx vitest run`
Expected: PASS con "No test files found" (o 0 tests) — confirma que vitest corre.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add react-router-dom + vitest tooling"
```

---

## Task 2: Lógica de estado (`utils/status.ts`)

Centraliza el mapeo de estado → bucket → color/label, hoy disperso en `TrackingResult`/`OrderSummaryCard`/`Timeline`.

**Files:**
- Create: `src/utils/status.ts`
- Test: `src/utils/status.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest';
import { statusBucket, statusChipClasses } from './status';

describe('statusBucket', () => {
  it('mapea estados crudos a buckets', () => {
    expect(statusBucket('delivered')).toBe('delivered');
    expect(statusBucket('transit')).toBe('transit');
    expect(statusBucket('InTransit')).toBe('transit');
    expect(statusBucket('pending')).toBe('pending');
    expect(statusBucket('exception')).toBe('attention');
    expect(statusBucket('')).toBe('pending');
  });
});

describe('statusChipClasses', () => {
  it('devuelve clases para cada bucket', () => {
    expect(statusChipClasses('delivered')).toContain('emerald');
    expect(statusChipClasses('transit')).toContain('blue');
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx vitest run src/utils/status.test.ts`
Expected: FAIL ("Cannot find module './status'").

- [ ] **Step 3: Implementar `src/utils/status.ts`**

```ts
export type StatusBucket = 'delivered' | 'transit' | 'pending' | 'attention';

const MAP: Record<string, StatusBucket> = {
  delivered: 'delivered',
  transit: 'transit',
  intransit: 'transit',
  pickup: 'transit',
  out_for_delivery: 'transit',
  availableforpickup: 'transit',
  outfordelivery: 'transit',
  exception: 'attention',
  expired: 'attention',
  undelivered: 'attention',
  deliveryfailure: 'attention',
};

/** Normaliza cualquier estado crudo (n8n/17track/manual) a un bucket. */
export const statusBucket = (status: string): StatusBucket => {
  const s = (status || '').toLowerCase().replace(/[\s-]/g, '');
  return MAP[s] ?? 'pending';
};

const CHIP: Record<StatusBucket, string> = {
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  transit: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  attention: 'bg-red-500/20 text-red-300 border-red-500/30',
};

/** Clases Tailwind del chip para un estado crudo. */
export const statusChipClasses = (status: string): string => CHIP[statusBucket(status)];

const LABEL: Record<StatusBucket, string> = {
  delivered: 'Delivered',
  transit: 'In transit',
  pending: 'Pending',
  attention: 'Attention',
};

export const statusBucketLabel = (status: string): string => LABEL[statusBucket(status)];
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npx vitest run src/utils/status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/status.ts src/utils/status.test.ts
git commit -m "feat: shared status bucket/color util"
```

---

## Task 3: `StatusChip` component

**Files:**
- Create: `src/components/StatusChip.tsx`

- [ ] **Step 1: Implementar el componente**

```tsx
import { statusChipClasses } from '../utils/status';

interface Props {
  status: string;       // bucket crudo (transit/delivered/...)
  label?: string;       // texto a mostrar (default: el status)
  className?: string;
}

export const StatusChip = ({ status, label, className = '' }: Props) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusChipClasses(status)} ${className}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
    {label ?? status}
  </span>
);
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusChip.tsx
git commit -m "feat: StatusChip component"
```

---

## Task 4: Router + AppShell + Sidebar (sin romper la app)

Mueve la UI actual de `App.tsx` a `SearchView` y monta el router. Al terminar, `/search` debe verse igual que la app de hoy, y `/dashboard` + `/history` como placeholders.

**Files:**
- Create: `src/views/SearchView.tsx` (mueve el contenido actual de `App.tsx`)
- Create: `src/views/DashboardView.tsx` (placeholder), `src/views/HistoryView.tsx` (placeholder)
- Create: `src/components/Sidebar.tsx`, `src/components/AppShell.tsx`, `src/router.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Extraer la UI actual a `SearchView.tsx`**

Mover TODO el cuerpo de búsqueda/resultados de `App.tsx` (estados `rawData/enrichedData/showResult/activeIndex/editing*`, `handleSearch`, `handleSearchByOrder`, `handleRefresh`, enrich `useEffect`, el render del carousel + modales) a un nuevo componente `SearchView` que reciba `user` y `role` por props o los lea de `useAuth`. `SearchView` lee `useAuth` directamente para mantenerse autónomo.

(El contenido es el actual de `App.tsx` líneas del bloque `!showResult ? ... : ...` y los modales; se copia tal cual, cambiando el wrapper raíz por un `<div>` simple porque el fondo/escala los provee `AppShell`.)

- [ ] **Step 2: Crear placeholders de Dashboard/History**

```tsx
// src/views/DashboardView.tsx
export const DashboardView = () => (
  <div className="p-6 text-white/70">Dashboard (próximo)</div>
);
```
```tsx
// src/views/HistoryView.tsx
export const HistoryView = () => (
  <div className="p-6 text-white/70">Historial (próximo)</div>
);
```

- [ ] **Step 3: Crear `Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';
import { Search, LayoutDashboard, History, LogOut, Truck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/search', icon: Search, label: 'Buscar' },
  { to: '/history', icon: History, label: 'Historial' },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const itemBase = 'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors';
  return (
    <>
      {/* Desktop: sidebar vertical */}
      <nav className="hidden md:flex fixed top-0 left-0 h-full w-20 flex-col items-center gap-6 py-5 bg-[#0f172a] border-r border-white/10 z-50">
        <Truck className="w-7 h-7 text-blue-500" />
        <div className="flex-1 flex flex-col gap-5 mt-2">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `${itemBase} ${isActive ? 'text-cyan-400' : 'text-white/50 hover:text-white/80'}`}>
              <Icon className="w-5 h-5" />{label}
            </NavLink>
          ))}
        </div>
        <button onClick={logout} className={`${itemBase} text-white/40 hover:text-white/70`} title={user?.email ?? ''}>
          <LogOut className="w-5 h-5" />Salir
        </button>
      </nav>

      {/* Mobile: bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-[#0f172a] border-t border-white/10 z-50">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `${itemBase} ${isActive ? 'text-cyan-400' : 'text-white/50'}`}>
            <Icon className="w-5 h-5" />{label}
          </NavLink>
        ))}
        <button onClick={logout} className={`${itemBase} text-white/40`}><LogOut className="w-5 h-5" />Salir</button>
      </nav>
    </>
  );
};
```

- [ ] **Step 4: Crear `AppShell.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import Feedback from './Feedback';
import { useAuth } from '../hooks/useAuth';

const bg = { background: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0b1120 60%)' };

export const AppShell = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen text-gray-900 selection:bg-primary/30" style={bg}>
      <Sidebar />
      <main className="md:pl-20 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>
      {user?.email && <Feedback userEmail={user.email} />}
    </div>
  );
};
```

- [ ] **Step 5: Crear `router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { SearchView } from './views/SearchView';
import { DashboardView } from './views/DashboardView';
import { HistoryView } from './views/HistoryView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'search', element: <SearchView /> },
      { path: 'history', element: <HistoryView /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
```

- [ ] **Step 6: Reescribir `App.tsx` para gate de auth + router**

```tsx
import { RouterProvider } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import { router } from './router';

function App() {
  const { user, loading, error, loginWithGoogle } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Login onLogin={loginWithGoogle} loading={loading} error={error} />;
  return <RouterProvider router={router} />;
}

export default App;
```

(Nota: `useAuth` debe poder llamarse desde `App` y desde los componentes hijos. Si `useAuth` no es un contexto compartido, cada llamada crea su propio listener — aceptable hoy; si se observa doble trabajo, envolver en un `AuthProvider` en una tarea futura. No bloquear este plan por eso.)

- [ ] **Step 7: Verificar typecheck + visual**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run dev`, abrir el navegador: login → redirige a `/dashboard` (placeholder), el sidebar navega a `/search` (funciona como antes) y `/history` (placeholder). Responsive: en ancho mobile aparece la bottom bar.

- [ ] **Step 8: Commit**

```bash
git add src/router.tsx src/components/AppShell.tsx src/components/Sidebar.tsx src/views/ src/App.tsx src/main.tsx
git commit -m "feat: router + app shell + sidebar nav (search view extracted)"
```

---

## Task 5: Lógica del dashboard (`utils/dashboard.ts`)

Agrupar por orden, filtrar y calcular ETA real. Lógica pura, testeada.

**Files:**
- Create: `src/utils/dashboard.ts`
- Test: `src/utils/dashboard.test.ts`

- [ ] **Step 1: Escribir tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { groupByOrder, applyFilters, realEta } from './dashboard';
import type { TrackingData } from '../types/tracking';

const mk = (o: Partial<TrackingData>): TrackingData => ({
  tracking_number: 't', courier_slug: 'ups', status: 'transit', status_detail: '',
  last_location: '', last_update: '', eta: '', raw_checkpoints: [], ...o,
});

describe('groupByOrder', () => {
  it('agrupa por sales_order (fallback PO/OC, luego sin orden)', () => {
    const items = [
      mk({ tracking_number: 'a', order_references: { sales_order: 'SO1' } }),
      mk({ tracking_number: 'b', order_references: { sales_order: 'SO1' } }),
      mk({ tracking_number: 'c', order_references: { purchase_order: 'PO9' } }),
      mk({ tracking_number: 'd' }),
    ];
    const groups = groupByOrder(items);
    expect(groups.find(g => g.key === 'SO1')?.items).toHaveLength(2);
    expect(groups.find(g => g.key === 'PO9')?.items).toHaveLength(1);
    expect(groups.find(g => g.key === '—')?.items).toHaveLength(1);
  });
});

describe('applyFilters', () => {
  const items = [
    mk({ tracking_number: 'a', status: 'delivered', courier_slug: 'ups' }),
    mk({ tracking_number: 'b', status: 'transit', courier_slug: 'estes' }),
  ];
  it('activos por defecto excluye delivered', () => {
    expect(applyFilters(items, { text: '', status: '', courier: '', showDelivered: false })).toHaveLength(1);
  });
  it('texto matchea tracking', () => {
    expect(applyFilters(items, { text: 'a', status: '', courier: '', showDelivered: true })).toHaveLength(1);
  });
  it('filtra por courier', () => {
    expect(applyFilters(items, { text: '', status: '', courier: 'estes', showDelivered: true })).toHaveLength(1);
  });
});

describe('realEta', () => {
  it('usa estimated_arrival si existe', () => {
    expect(realEta(mk({ logistics_eta: { estimated_arrival: '2026-07-09T00:00:00Z' } }))).toBe('2026-07-09T00:00:00Z');
  });
  it('suma semanas al eta del courier', () => {
    const r = realEta(mk({ eta: '2026-06-25T00:00:00Z', logistics_eta: { total_additional_weeks: 2 } }));
    expect(r?.startsWith('2026-07-09')).toBe(true);
  });
  it('null si no hay datos de logística', () => {
    expect(realEta(mk({ eta: '2026-06-25T00:00:00Z' }))).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npx vitest run src/utils/dashboard.test.ts`
Expected: FAIL ("Cannot find module './dashboard'").

- [ ] **Step 3: Implementar `src/utils/dashboard.ts`**

```ts
import { addWeeks, isValid } from 'date-fns';
import type { TrackingData } from '../types/tracking';
import { statusBucket } from './status';

export interface OrderGroup {
  key: string;            // SO/PO/OC o '—'
  items: TrackingData[];
}

const orderKeyOf = (t: TrackingData): string => {
  const r = t.order_references;
  return (r?.sales_order || r?.purchase_order || r?.order_confirmation || '—').toUpperCase();
};

/** Agrupa envíos por su orden principal. Grupos ordenados; '—' (sin orden) al final. */
export const groupByOrder = (items: TrackingData[]): OrderGroup[] => {
  const map = new Map<string, TrackingData[]>();
  for (const t of items) {
    const k = orderKeyOf(t);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return [...map.entries()]
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => (a.key === '—' ? 1 : b.key === '—' ? -1 : a.key.localeCompare(b.key)));
};

export interface DashboardFilters {
  text: string;
  status: string;        // '' = todos, o un bucket
  courier: string;       // '' = todos, o slug
  showDelivered: boolean;
}

export const applyFilters = (items: TrackingData[], f: DashboardFilters): TrackingData[] => {
  const text = f.text.trim().toLowerCase();
  return items.filter((t) => {
    if (!f.showDelivered && statusBucket(t.status) === 'delivered') return false;
    if (f.status && statusBucket(t.status) !== f.status) return false;
    if (f.courier && (t.courier_slug || '').toLowerCase() !== f.courier.toLowerCase()) return false;
    if (text) {
      const hay = [
        t.tracking_number, t.courier_slug, t.last_location,
        t.order_references?.sales_order, t.order_references?.purchase_order,
        t.order_references?.order_confirmation,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(text)) return false;
    }
    return true;
  });
};

/** ETA real = estimated_arrival, o eta del courier + semanas de logística. null si no hay datos de logística. */
export const realEta = (t: TrackingData): string | null => {
  const le = t.logistics_eta;
  if (!le) return null;
  if (le.estimated_arrival) return le.estimated_arrival;
  if (le.total_additional_weeks && t.eta) {
    const base = new Date(t.eta);
    if (isValid(base)) return addWeeks(base, le.total_additional_weeks).toISOString();
  }
  return null;
};

/** Lista única de couriers presentes (para el dropdown de filtro). */
export const courierOptions = (items: TrackingData[]): string[] =>
  [...new Set(items.map((t) => t.courier_slug).filter(Boolean))].sort();
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npx vitest run src/utils/dashboard.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/utils/dashboard.ts src/utils/dashboard.test.ts
git commit -m "feat: dashboard grouping/filter/realEta logic"
```

---

## Task 6: `useAllTrackings` hook

**Files:**
- Create: `src/hooks/useAllTrackings.ts`

- [ ] **Step 1: Implementar el hook**

```ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { TrackingData } from '../types/tracking';
import { mapTrackingDoc } from './useTrackingStore';

/** Suscripción en vivo a toda la colección `trackings`, ya enriquecida con logistics_eta. */
export const useAllTrackings = () => {
  const [items, setItems] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'trackings'), (snap) => {
      setItems(snap.docs.map((d) => mapTrackingDoc(d.data(), d.id)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  return { items, loading };
};
```

- [ ] **Step 2: Exportar `mapTrackingDoc` desde `useTrackingStore.ts`**

En `src/hooks/useTrackingStore.ts`, renombrar la función interna `mapDoc` a un export público `export const mapTrackingDoc = (d: any, id?: string): TrackingData => ({ ... })` (mismo cuerpo actual) y actualizar sus usos internos (`fetchTrackingDoc`, `queryTrackingsByOrder`) para llamar `mapTrackingDoc`.

Nota: el dashboard necesita `logistics_eta` por fila. Como `onSnapshot` solo trae `trackings`, enriquecer en el componente (Task 7) con `fetchETA` por item, o aceptar que la columna "ETA real" use `logistics_eta` embebido si existe. Decisión: el `DashboardView` hace un `fetchETA` por tracking visible y lo mergea (igual patrón que el enrich de `SearchView`).

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAllTrackings.ts src/hooks/useTrackingStore.ts
git commit -m "feat: useAllTrackings live snapshot + export mapTrackingDoc"
```

---

## Task 7: `FiltersBar` + `ShipmentsTable` + `DashboardView`

**Files:**
- Create: `src/components/FiltersBar.tsx`, `src/components/ShipmentsTable.tsx`
- Modify: `src/views/DashboardView.tsx`

- [ ] **Step 1: `FiltersBar.tsx`**

```tsx
import { Search } from 'lucide-react';
import type { DashboardFilters } from '../utils/dashboard';

interface Props {
  filters: DashboardFilters;
  couriers: string[];
  onChange: (f: DashboardFilters) => void;
}

const ctrl = 'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40';

export const FiltersBar = ({ filters, couriers, onChange }: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative flex-1 min-w-[180px]">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
      <input value={filters.text} onChange={(e) => onChange({ ...filters, text: e.target.value })}
        placeholder="Buscar tracking, SO, PO, ubicación..." className={`${ctrl} w-full pl-9`} />
    </div>
    <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })} className={ctrl}>
      <option value="">Todos los estados</option>
      <option value="transit">In transit</option>
      <option value="pending">Pending</option>
      <option value="delivered">Delivered</option>
      <option value="attention">Attention</option>
    </select>
    <select value={filters.courier} onChange={(e) => onChange({ ...filters, courier: e.target.value })} className={ctrl}>
      <option value="">Todos los couriers</option>
      {couriers.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
    <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
      <input type="checkbox" checked={filters.showDelivered}
        onChange={(e) => onChange({ ...filters, showDelivered: e.target.checked })} />
      Ver entregados
    </label>
  </div>
);
```

- [ ] **Step 2: `ShipmentsTable.tsx`**

```tsx
import { format, isValid } from 'date-fns';
import { Ship } from 'lucide-react';
import type { TrackingData } from '../types/tracking';
import { groupByOrder, realEta } from '../utils/dashboard';
import { statusBucket } from '../utils/status';
import { StatusChip } from './StatusChip';

interface Props {
  items: TrackingData[];
  onRowClick: (t: TrackingData) => void;
}

const fdate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return isValid(d) ? format(d, 'MMM d') : s;
};

export const ShipmentsTable = ({ items, onRowClick }: Props) => {
  const groups = groupByOrder(items);
  if (items.length === 0) {
    return <p className="text-white/40 text-sm py-10 text-center">No hay envíos que coincidan.</p>;
  }
  return (
    <div className="text-sm">
      {/* header (solo desktop) */}
      <div className="hidden md:flex text-white/50 text-xs font-semibold px-3 pb-2 border-b border-white/10">
        <span className="flex-[1.6]">Tracking</span><span className="flex-1">Courier</span>
        <span className="flex-[1.2]">Estado</span><span className="flex-1">ETA courier</span>
        <span className="flex-[1.1]">ETA real ⚖️</span><span className="flex-[1.3]">Ubicación</span>
      </div>
      {groups.map((g) => {
        const counts = g.items.reduce<Record<string, number>>((a, t) => {
          const b = statusBucket(t.status); a[b] = (a[b] ?? 0) + 1; return a;
        }, {});
        return (
          <div key={g.key} className="mt-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/5 rounded-lg text-xs">
              <span className="font-bold text-cyan-300 font-mono">{g.key}</span>
              <span className="text-white/50">{g.items.length} envío{g.items.length !== 1 ? 's' : ''}</span>
              <span className="ml-auto flex gap-2 text-white/50">
                {Object.entries(counts).map(([b, n]) => <span key={b}>{n} {b}</span>)}
              </span>
            </div>
            {g.items.map((t, i) => {
              const re = realEta(t);
              return (
                <button key={t.tracking_number + i} onClick={() => onRowClick(t)}
                  className="w-full flex flex-col md:flex-row md:items-center text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <span className="flex-[1.6] font-mono text-white flex items-center gap-1">
                    {t.data_source === 'manual' && <Ship className="w-3.5 h-3.5 text-cyan-400" />}{t.tracking_number}
                  </span>
                  <span className="flex-1 text-white/70 capitalize">{t.carrier_info?.name || t.courier_slug || '—'}</span>
                  <span className="flex-[1.2] py-1"><StatusChip status={t.status} label={t.status_detail || statusBucket(t.status)} /></span>
                  <span className="flex-1 text-white/60">{fdate(t.eta)}</span>
                  <span className="flex-[1.1] text-amber-400">{re ? fdate(re) : '—'}</span>
                  <span className="flex-[1.3] text-white/50 truncate">{t.last_location || '—'}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 3: `DashboardView.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Ship } from 'lucide-react';
import { useAllTrackings } from '../hooks/useAllTrackings';
import { useAuth } from '../hooks/useAuth';
import { fetchETA } from '../hooks/useLogisticsETA';
import { applyFilters, courierOptions, type DashboardFilters } from '../utils/dashboard';
import { canEditLogistics } from '../types/tracking';
import type { TrackingData } from '../types/tracking';
import { FiltersBar } from '../components/FiltersBar';
import { ShipmentsTable } from '../components/ShipmentsTable';
import { ShipmentDrawer } from '../components/ShipmentDrawer';
import { ManualShipmentForm } from '../components/ManualShipmentForm';
import { saveManualShipment } from '../hooks/useTrackingStore';

const EMPTY: DashboardFilters = { text: '', status: '', courier: '', showDelivered: false };

export const DashboardView = () => {
  const { items, loading } = useAllTrackings();
  const { role, user } = useAuth();
  const [filters, setFilters] = useState(EMPTY);
  const [etas, setEtas] = useState<Record<string, TrackingData['logistics_eta']>>({});
  const [selected, setSelected] = useState<TrackingData | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Enriquecer con logistics_eta por tracking visible
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = items.filter((t) => !(t.tracking_number in etas));
      for (const t of missing) {
        const eta = await fetchETA(t.tracking_number).catch(() => null);
        if (!cancelled) setEtas((prev) => ({ ...prev, [t.tracking_number]: eta || undefined }));
      }
    })();
    return () => { cancelled = true; };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const enriched = useMemo(
    () => items.map((t) => (etas[t.tracking_number] ? { ...t, logistics_eta: etas[t.tracking_number] } : t)),
    [items, etas],
  );
  const filtered = useMemo(() => applyFilters(enriched, filters), [enriched, filters]);
  const couriers = useMemo(() => courierOptions(items), [items]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Envíos activos</h1>
          <p className="text-white/50 text-sm">{filtered.length} de {items.length} envíos</p>
        </div>
        {role && canEditLogistics(role) && (
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            <Ship className="w-4 h-4" /> + Marítimo
          </button>
        )}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5">
        <FiltersBar filters={filters} couriers={couriers} onChange={setFilters} />
        <div className="mt-4">
          {loading ? <p className="text-white/40 text-sm py-10 text-center">Cargando…</p>
            : <ShipmentsTable items={filtered} onRowClick={setSelected} />}
        </div>
      </div>

      {selected && <ShipmentDrawer tracking={selected} role={role} onClose={() => setSelected(null)} />}
      {showManual && user?.email && (
        <ManualShipmentForm onClose={() => setShowManual(false)}
          onSave={async (input) => { await saveManualShipment(input, user.email!); setShowManual(false); }} />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Verificar typecheck + visual**

Run: `npx tsc --noEmit` → exit 0 (puede faltar `ShipmentDrawer` hasta Task 8 — si bloquea, comentar temporalmente su import/uso y descomentar en Task 8).
Run: `npm run dev` → `/dashboard` muestra la tabla agrupada con datos reales (Estes/UPS/marítimo), filtros funcionan, +Marítimo abre el form.

- [ ] **Step 5: Commit**

```bash
git add src/components/FiltersBar.tsx src/components/ShipmentsTable.tsx src/views/DashboardView.tsx
git commit -m "feat: dashboard view with grouped shipments table + filters"
```

---

## Task 8: `ShipmentDrawer` (detalle sobre el dashboard)

**Files:**
- Create: `src/components/ShipmentDrawer.tsx`

- [ ] **Step 1: Implementar el drawer**

```tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { TrackingData, UserRole } from '../types/tracking';
import { fetchETA, saveETA } from '../hooks/useLogisticsETA';
import { fetchOrderRefs } from '../hooks/useOrderTrackings';
import { TrackingResult } from './TrackingResult';
import { LogisticsETAForm } from './LogisticsETAForm';
import { useAuth } from '../hooks/useAuth';

interface Props {
  tracking: TrackingData;
  role: UserRole | null;
  onClose: () => void;
}

export const ShipmentDrawer = ({ tracking, role, onClose }: Props) => {
  const { user } = useAuth();
  const [data, setData] = useState<TrackingData>(tracking);
  const [editingEta, setEditingEta] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [eta, refs] = await Promise.all([
        fetchETA(tracking.tracking_number).catch(() => null),
        fetchOrderRefs(tracking.tracking_number).catch(() => null),
      ]);
      if (cancelled) return;
      setData((d) => ({ ...d, logistics_eta: eta || d.logistics_eta, order_references: { ...d.order_references, ...refs } }));
    })();
    return () => { cancelled = true; };
  }, [tracking.tracking_number]);

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full overflow-y-auto bg-gray-950/95 border-l border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="pt-12">
          <TrackingResult data={data} role={role} showBackButton={false}
            onEditETA={role && (role === 'logistics' || role === 'admin') ? () => setEditingEta(true) : undefined} />
        </div>
      </div>
      {editingEta && user?.email && (
        <LogisticsETAForm trackingNumber={data.tracking_number} carrierEta={data.eta} initial={data.logistics_eta}
          onClose={() => setEditingEta(false)}
          onSave={async (etaData) => {
            await saveETA(data.tracking_number, etaData, user.email!);
            const fresh = await fetchETA(data.tracking_number);
            if (fresh) setData((d) => ({ ...d, logistics_eta: fresh }));
          }} />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verificar typecheck + visual**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run dev` → clic en una fila del dashboard abre el drawer con el detalle + timeline; "Edit Logistics ETA" (logística) abre el form y al guardar refresca el ETA.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShipmentDrawer.tsx src/views/DashboardView.tsx
git commit -m "feat: shipment detail drawer over dashboard"
```

---

## Task 9: Historial de búsquedas

**Files:**
- Create: `src/hooks/useSearchHistory.ts`
- Modify: `src/views/HistoryView.tsx`, `src/views/SearchView.tsx`, `firestore.rules`

- [ ] **Step 1: `useSearchHistory.ts`**

```ts
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface SearchEntry { query: string; type: 'tracking' | 'order'; result_count: number; ts: string; }

export const recordSearch = async (uid: string, entry: Omit<SearchEntry, 'ts'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'users', uid, 'searches'), { ...entry, ts: new Date().toISOString() });
  } catch { /* best-effort */ }
};

export const fetchRecentSearches = async (uid: string): Promise<SearchEntry[]> => {
  const q = query(collection(db, 'users', uid, 'searches'), orderBy('ts', 'desc'), limit(50));
  const snap = await getDocs(q);
  const seen = new Set<string>();
  const out: SearchEntry[] = [];
  for (const d of snap.docs) {
    const e = d.data() as SearchEntry;
    const k = `${e.type}:${e.query.toUpperCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
    if (out.length >= 30) break;
  }
  return out;
};
```

- [ ] **Step 2: Registrar búsquedas en `SearchView`**

En los handlers `handleSearch` y `handleSearchByOrder` de `SearchView`, tras obtener resultados con `user`, llamar `recordSearch(user.uid, { query, type: 'tracking'|'order', result_count })`. (No bloquear la UI: sin `await` o con `.catch`.)

- [ ] **Step 3: `HistoryView.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Package, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchRecentSearches, type SearchEntry } from '../hooks/useSearchHistory';

export const HistoryView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRecentSearches(user.uid).then(setItems).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Clock className="w-6 h-6" /> Historial</h1>
      {loading ? <p className="text-white/40">Cargando…</p>
        : items.length === 0 ? <p className="text-white/40">Todavía no hay búsquedas.</p>
        : (
          <div className="space-y-2">
            {items.map((e, i) => (
              <button key={i} onClick={() => navigate(`/search?q=${encodeURIComponent(e.query)}`)}
                className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-left transition-colors">
                {e.type === 'order' ? <Package className="w-4 h-4 text-amber-400" /> : <SearchIcon className="w-4 h-4 text-blue-400" />}
                <span className="font-mono text-white">{e.query}</span>
                <span className="text-white/40 text-xs ml-auto">{e.result_count} envío(s)</span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
};
```

- [ ] **Step 4: `SearchView` lee `?q=` para repetir búsqueda**

En `SearchView`, con `useSearchParams`, si hay `q` al montar, ejecutar la búsqueda correspondiente (detectar SO/PO/OC con `isOrderReference`).

- [ ] **Step 5: Regla Firestore**

En `firestore.rules`, dentro de `match /users/{uid}`, agregar:

```
match /searches/{searchId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

- [ ] **Step 6: Verificar typecheck + visual**

Run: `npx tsc --noEmit` → exit 0.
Run: `npm run dev` → hacer una búsqueda → aparece en `/history` → clic la repite. Deploy de reglas se hace en Task 10.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSearchHistory.ts src/views/HistoryView.tsx src/views/SearchView.tsx firestore.rules
git commit -m "feat: per-user search history"
```

---

## Task 10: Responsive polish + integración + deploy

**Files:**
- Modify: `src/components/ShipmentsTable.tsx` (cards en mobile), `src/views/SearchView.tsx` (paddings), revisar `TrackingResult` en mobile.

- [ ] **Step 1: Tabla → cards en mobile**

En `ShipmentsTable`, la fila ya usa `flex-col md:flex-row`. Agregar, dentro de la fila en mobile, mini-labels para cada dato (ej. `<span className="md:hidden text-white/40 text-xs">Courier:</span>`) o envolver cada par en bloque. Verificar que en `< md` cada envío se lee como tarjeta apilada (tracking arriba, luego courier/estado/ETAs/ubicación con su label).

- [ ] **Step 2: Verificar responsive**

Run: `npm run dev`, DevTools responsive (375px): sidebar→bottom bar; dashboard tabla→cards legibles; search y drawer usables; modales ok.

- [ ] **Step 3: Typecheck + lint final**

Run: `npx tsc --noEmit` → exit 0.
Run: `npx vitest run` → todos los tests PASAN.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: responsive polish for dashboard + mobile nav"
```

- [ ] **Step 5: Build + deploy (con OK del usuario)**

```bash
npm run build
firebase deploy --only hosting,firestore:rules --project tracking-system-3b6fc
```
Expected: "Deploy complete!" + reglas released.

- [ ] **Step 6: Smoke test en producción**

Abrir https://tracking-system-3b6fc.web.app: login → Dashboard con datos reales; navegar a Buscar/Historial; buscar `3700018637` y `SO19443`; abrir detalle; en logística, editar ETA y crear marítimo; probar en mobile.

- [ ] **Step 7: Merge**

```bash
git checkout main && git merge --no-ff feat/webapp-redesign
```
(o abrir PR si se prefiere revisión.)

---

## Notas de ejecución

- `useAuth` se llama desde varios componentes. Si genera listeners duplicados notorios, una mejora futura es un `AuthProvider` por contexto — fuera del alcance de este plan.
- El dashboard hace un `fetchETA` por tracking visible; para ~100s está bien. Si crece mucho, considerar denormalizar `logistics_eta` dentro del doc `trackings`.
- Mantener el `ErrorBoundary` global (ya está en `main.tsx`).
