# Salto calidad CRM — registro de cambios

Documentación de la pasada de pulido transversal (tokens, accesibilidad, responsive, rendimiento, i18n, salud de código). No sustituye el plan original; resume **qué quedó implementado en el repositorio** y en qué archivos.

---

## 1. Sistema visual y tokens

### `src/index.css`

- **Skeleton**: color-mix con `--bg-panel` / `--text-main` para tema claro/oscuro.
- **`.glass-hover`**: mezcla con `var(--text-main)` en lugar de negro puro.
- **`.priority-*`**: colores semánticos (`--color-danger`, `--color-warning`, `--color-fg-subtle`).
- **`.crm-themed-input:focus`**: alineado con `--color-ring`.
- **Gradientes de texto** (`.text-gradient*`): escalas de acento en lugar de hex fijos.
- **`.backdrop-dark` / `.border-brand-glow`**: overrides en `html.light` donde aplica.
- **Utilidad `.text-2xs`**: microcopy cuando hace falta por debajo de `text-xs`.
- **Área principal (`<main>`)**: clase única **`.app-main-surface`** — wash de marca + degradados + sombras en dark y `.light` (sustituye el antiguo reparto entre `app-main-backdrop` solo en algunas rutas y `app-main-priority` en otras). Todas las rutas comparten el mismo fondo.

### `src/styles/tokens.css`

- **`--color-fg-subtle` en `html.light`**: ajuste para contraste AA en texto pequeño sobre superficies claras (valor tipo `82 100 130`).

### `tailwind.config.js`

- **`transitionDuration`**: `fast` (150ms), `base` (200ms), `slow` (500ms) para sustituir `duration-150|200|500|700` sueltos.
- **`minHeight.control`**: alias para controles (p. ej. sustitución de `min-h-[40px]` donde se aplicó).

### `src/lib/chartTheme.ts`

- Tema compartido para gráficos (`useChartTheme`, lectura de CSS variables) usado en Dashboard, Reports y Forecast en lugar de hex embebidos.

---

## 2. Layout, navegación y shell

### `src/components/layout/Layout.tsx`

- **Sidebar en móvil (`< md`)**: drawer con backdrop, cierre al cambiar de ruta, `Escape`, al pasar a viewport `md+`, y bloqueo de scroll de `body` mientras está abierto.
- **`<main>`**: siempre **`app-main-surface`** (sin lista de rutas “priority”).

### `src/components/layout/Topbar.tsx`

- Botón **menú (hamburguesa)** solo `< md` para abrir el drawer; **`aria-label`** en búsqueda móvil y en el menú de usuario cuando el nombre no es visible.
- **Búsqueda**: control completo desde `sm`; solo icono en `< sm` que abre la paleta de comandos.

### `src/components/layout/Sidebar.tsx`

- Iconos Lucide normalizados (p. ej. tamaño 18 en ítems principales).

### `src/components/layout/CommandPalette.tsx`

- **`role="dialog"`**, **`aria-labelledby`**, título accesible, ciclo de foco (Tab) en el panel, indicación de **Esc** (no solo texto de “cerrar”).

---

## 3. Componentes UI

### `src/components/ui/Modal.tsx`

- **`DialogPanelHeader`**: prop **`titleId`** para enlazar con **`aria-labelledby`** en `Modal` y `SlideOver`.
- **`ConfirmDialog`**: foco inicial en cancelar, trampa de Tab básica, **`aria-modal`**, anchos responsive (`max-w-full` en móvil donde aplica).

### `src/components/ui/PageHeader.tsx`

- Subtítulo con **`text-fg-subtle`** (alineado con el sistema).

### `src/components/ui/Spinner.tsx`

- **`aria-label`** por defecto desde traducciones (`common.loading`).

### `src/components/ui/Toolbar.tsx`, `ThemeSwitcher.tsx`

- Ajustes menores de consistencia (duraciones tokenizadas, alturas de control donde tocaba).

### `src/components/deals/DealCard.tsx`

- Ajustes de presentación coherentes con el resto de cartas.

### `src/components/email/EmailComposer.tsx`

- Cambios de formato/UX/accesibilidad en el flujo del compositor (diff grande en historial git).

---

## 4. Enrutado y rendimiento

### `src/App.tsx`

- **Lazy loading** de páginas pesadas: Contacts, Leads, Companies, Deals, Activities, Settings, Inbox, EmailTemplates, Calendar, Sequences (además de Dashboard, Reports, Forecast, ManagerDashboard ya existentes).
- Un único **`<Suspense>`** envolviendo **`<Routes>`** con fallback de carga localizado.
- Efecto que llama **`loadDateFnsLocale`** al montar y al cambiar el idioma en **`useI18nStore`**.

### `vite.config.ts`

- **`manualChunks`**: chunks separados para **`recharts`** y **`date-fns`** (además de react/ui/supabase existentes).

---

## 5. Fechas e i18n

### `src/lib/dateFnsLocale.ts` + `src/hooks/useDateLocale.ts`

- Carga **dinámica** del locale de `date-fns` según idioma activo.
- **`getLoadedDateFnsLocale()`** usado desde **`src/utils/formatters.ts`** para `formatRelativeDate` coherente con el idioma cargado.

### `src/i18n/types.ts`, `en.ts`, `es.ts`, `pt.ts`

- Claves nuevas o ampliadas según pantallas: productos (vacío / filtrado), notificaciones (pistas de vacío), leads, forecast (**`growthUnavailable`**), etc.
- **`fr` / `de` / `it`**: siguen basados en `en` con overrides parciales; las nuevas claves en `en` quedan disponibles por spread hasta traducción dedicada.

---

## 6. Utilidades

### `src/utils/a11y.ts`

- **`rowActivationKeyDown`**: Enter/Espacio en filas de tabla con **`tabIndex={0}`**.

### `src/utils/formatters.ts`

- Eliminación de import estático masivo de locales `date-fns`; uso de **`getLoadedDateFnsLocale()`**.

---

## 7. Datos, stores y hooks

### `src/hooks/useDataInit.ts`

- **Polling de deals** (`setInterval`): solo si **`document.visibilityState === 'visible'`**.
- **Refresh Gmail**: flag **`gmailRefreshCancelled`** en cleanup para no aplicar token si el efecto se desmontó (no `AbortController` en la función edge si la API no lo expone).

### `src/store/emailStore.ts` — `partialize`

- Los **`emails`** persistidos **sin cuerpos** (`body` vacío, `htmlBody` sin persistir) para no guardar PII/cuerpos grandes en localStorage; metadatos y resto de campos según diseño actual.

### `src/hooks/useLocalStorage.ts`

- Comentario de propósito (sincronización vía stores/Supabase); eliminado el TODO obsoleto.

### `src/hooks/useFilters.ts`

- **Eliminado** (no usado en `src/`). **`knip.json`**: quitada la entrada de ignore asociada.

---

## 8. Configuración de proyecto

### `package.json`

- **`lint:ci`**: **`--max-warnings 200`** (antes 250).

---

## 9. Páginas (resumen por archivo)

| Área | Archivos | Cambios típicos |
|------|-----------|------------------|
| Dashboard | `Dashboard.tsx` | `useChartTheme`, `useDateLocale`, StatCard/KPIs |
| CRM core | `Contacts.tsx`, `Companies.tsx`, `Deals.tsx`, `Leads.tsx` | PageHeader/StatCard/EmptyState/skeletons, errores de lista, tablas (caption, `scope`, teclado en filas), selectores Zustand |
| Detalle | `ContactDetail.tsx`, `CompanyDetail.tsx` | `useDateLocale`, StatCard, copy |
| Pipeline | `PipelineTimeline.tsx`, `Forecast.tsx`, `Reports.tsx`, `ManagerDashboard.tsx` | PageHeader, charts, tablas, `forecast.growthUnavailable` |
| Productividad | `Activities.tsx`, `Calendar.tsx`, `FollowUps.tsx`, `Inbox.tsx`, `EmailTemplates.tsx`, `Sequences.tsx` | Patrones de página, skeletons, i18n, ajustes UI |
| Config / equipo | `Settings.tsx`, `TeamManagement.tsx`, `SalesGoals.tsx`, `Products.tsx`, `Automations.tsx`, `Notifications.tsx` | PageHeader, EmptyState, selectores Zustand donde aplica |
| Deals | `Deals.tsx` | `jspdf` + `jspdf-autotable` por **import dinámico** en export PDF, kanban scroll-snap móvil, tabla lista |
| Auditoría | `AuditLog.tsx` | `useDateLocale` |

---

## 10. Documentación interna del repo

### `.planning/codebase/CONVENTIONS.md`

- Notas sobre grid de tamaños de iconos (p. ej. 13/14/16/18/22).

---

## 11. Qué quedó fuera o opcional

- **Virtualización de Inbox** (`@tanstack/react-virtual`): no añadida (dependencia nueva no aprobada en plan).
- **Barrido completo de literales JSX en inglés**: no automatizado en esta pasada.
- **Sustituir todos los `supabase as any` en stores**: requiere ampliar/regenerar `database.types.ts` para tablas no tipadas.

---

## 12. Verificación recomendada

- `npx tsc --noEmit`
- `npm run lint:ci`
- `npm run test:run`
- Revisión visual claro/oscuro y `< md` (drawer, búsqueda, tablas con scroll horizontal donde aplica).

---

*Última actualización: documento alineado con el commit que añade este archivo y el conjunto de cambios del “salto calidad” descrito arriba.*
