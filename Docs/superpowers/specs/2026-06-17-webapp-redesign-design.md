# Dynapro Tracking — Rediseño de la webapp (design spec)

**Fecha:** 2026-06-17
**Estado:** Aprobado (diseño) — pendiente plan de implementación

## Contexto

La webapp actual (`tracking-system-3b6fc`, Firebase Hosting + Firestore) es de **una sola pantalla**: buscador → carousel de tarjetas de resultado. Funciona (email-first + 17track en vivo ya andan), pero es visualmente plana, no tiene navegación, ni dashboard, ni historial, y no es del todo responsive.

Stack: React + Vite + TypeScript + Tailwind, Firestore, Firebase Auth (Google, dominios @dynaproco.com / @dynaproequipment.com). RBAC por rol (`logistics | sales | cas | admin`). Sin router hoy.

Colecciones Firestore existentes: `trackings` (envíos, fuente de verdad — alimentada por WF2/email + 17track Sync), `logistics_eta`, `order_trackings`, `tracking_metadata`, `users`, `usage_sessions`, `feedback`.

## Objetivos

1. Look & feel moderno (**dark pro**: glass, acentos cian/azul, jerarquía clara) — que deje de ser "sosa".
2. **Navegación** con sidebar: **Buscar · Dashboard · Historial**.
3. **Dashboard** de envíos: tabla agrupada por orden (SO/PO) con detalle de cada envío.
4. **Historial de búsquedas** por usuario.
5. Espacio para que **Logística** cargue/visualice su ETA con aduanas.
6. **Responsive** (compu y celular).

## No-objetivos (YAGNI)

- No tocar los workflows de n8n ni el modelo de datos de tracking (ya validados).
- No agregar tracking de contenedores por API (marítimo sigue manual).
- No multi-idioma formal (se mantienen labels EN/ES como están).
- No gráficos/analytics todavía (posible fase futura).

## Arquitectura

### App shell + routing
- Se agrega **react-router-dom**. Rutas: `/dashboard` (inicio post-login), `/search`, `/history`. URLs compartibles (ej. `/dashboard?order=SO19443`).
- **Layout** con `<Sidebar>` persistente + `<Outlet>` para la vista activa.
- **Sidebar**: logo, links (Buscar/Dashboard/Historial), bloque de usuario + logout abajo. En `< md` se colapsa a **barra inferior** (bottom tab bar).
- Landing post-login: **Dashboard**.

### Vistas (cada una un componente con un propósito claro)
- **DashboardView** — tabla agrupada de envíos.
- **SearchView** — buscador + resultado (reusa `TrackingResult`/carousel actual con el nuevo look).
- **HistoryView** — búsquedas recientes del usuario.

### Componentes nuevos / reutilizables
- `Sidebar` / `BottomNav` (responsive).
- `ShipmentsTable` — tabla agrupada por orden; fila → navega a detalle.
- `StatusChip` — chip de estado consistente (extraído, usado en tabla y tarjeta).
- `FiltersBar` — texto + estado + courier + toggle activos/entregados.
- Se mantienen: `TrackingResult`, `Timeline`, `OrderSummaryCard`, `LogisticsETAForm`, `OrderLinkForm`, `ManualShipmentForm`, `Login`, `Feedback`.

## Dashboard (detalle)

- **Fuente de datos**: hook `useAllTrackings` con **`onSnapshot`** (actualización en vivo) sobre la colección `trackings`. Volumen ~100s → filtrado/orden/agrupado **client-side**.
- **Agrupación**: por orden, usando `sales_order` (fallback `purchase_order`, luego `order_confirmation`). Header de grupo: ref + cliente (si se conoce) + resumen de estados (chips de conteo).
- **Columnas**: Tracking · Courier · Estado (chip + `status_detail` como subtítulo) · ETA courier · **ETA real (logística)** · Última ubicación · Actualizado (relativo).
- **ETA real (logística)**: `logistics_eta.estimated_arrival` (o courier ETA + `total_additional_weeks`). Si no existe → affordance "+ revisar" (solo logística/admin).
- **Filtros** (`FiltersBar`): búsqueda de texto (tracking/SO/PO/cliente), estado (dropdown), courier (dropdown), toggle "solo activos / ver entregados" (default: activos = status ≠ delivered).
- **Acciones**: fila → abre el **detalle en un drawer/modal** sobre el dashboard (reusa `TrackingResult` + `Timeline`), para no perder filtros ni contexto. Botón **+ Marítimo** (abre `ManualShipmentForm`, logística/admin).
- **Marítimos**: marcados con 🚢; sin "Update now" ni deep-link (ya implementado).

## Búsqueda

- Igual a hoy funcionalmente (por tracking o por orden), con el nuevo look.
- Al ejecutar una búsqueda con resultado → se registra en el historial del usuario.

## Historial

- Subcolección **`users/{uid}/searches`**: `{ query, type: 'tracking'|'order', result_count, ts }`.
- `HistoryView`: lista de recientes (dedup por query, más nuevo primero, límite ~30) con clic para repetir la búsqueda.
- Escritura best-effort (no bloquea la búsqueda si falla).
- Reglas Firestore: el usuario lee/escribe solo su propia subcolección.

## Sistema visual

- **Dark pro**: fondo slate profundo, superficies glass (`bg-white/5` + `border-white/10`), acentos cian/azul.
- **StatusChip** por color: entregado = verde, en tránsito = azul, pendiente/label = ámbar, excepción = rojo.
- Tipografía: títulos sólidos, datos en mono donde aplica (tracking#), jerarquía clara.
- Tokens de color/clases centralizados para consistencia entre tabla y tarjetas.

## Responsive

- Sidebar → **bottom tab bar** en `< md`.
- `ShipmentsTable` → **tarjetas apiladas** en celular (cada envío como card compacta).
- Tarjeta de detalle y modales: ya usables; se revisa padding/anchos en mobile.

## RBAC

- Todos los autenticados: ven Buscar / Dashboard / Historial (lectura).
- **Logística/admin**: editan ETA de logística, crean envíos marítimos, marcan "revisado".
- Helpers existentes (`canEditLogistics`, `canSeeAdjustedEta`) se reutilizan; el ETA real ajustado se muestra a logística/admin siempre y a otros solo si `reviewed`.

## Datos / contratos nuevos

- `users/{uid}/searches/{autoId}`: `{ query: string, type: 'tracking'|'order', result_count: number, ts: ISO string }`.
- Sin cambios en el contrato de `trackings`.
- `firestore.rules`: agregar `match /users/{uid}/searches/{id}` con read/write solo del propio uid.

## Verificación

- Navegación entre las 3 vistas + deep-link por URL.
- Dashboard: agrupa, filtra, ordena; clic en fila abre detalle; toggle activos/entregados.
- ETA real se calcula y se ve según rol; "+ revisar" abre el form.
- Historial: una búsqueda queda registrada y se puede repetir; aislado por usuario.
- Responsive: sidebar→bottom nav y tabla→cards en breakpoint mobile.
- `tsc -b` limpio; deploy a Firebase Hosting; smoke test con datos reales (Estes/UPS/marítimo).

## Riesgos / notas

- Agregar react-router es un cambio estructural de `App.tsx` (hoy todo vive ahí). Se refactoriza en layout + vistas.
- `useTracking`/`useTrackingStore` se reutilizan; el Dashboard necesita un lookup de "todos los trackings" (nuevo hook) — lectura simple de la colección.
- Mantener el ErrorBoundary global.
