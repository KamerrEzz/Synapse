# Synapse — Nocturno reestructurado (dashboard shell)

Versión del diseño implementado: `src-app-dashboard-workspace-layout-tsx` v3 (ver `.impeccable/surfaces/`).

This design documents the built dashboard structure: how the dark world keeps
its palette while the skeleton changes — sidebar gone, navigation on top,
content in a single editorial column.

## Thesis

El mundo oscuro se mantiene; el ESQUELETO cambia. La sidebar izquierda
desaparece; la navegación pasa a una barra superior; el contenido vive en una
columna única, espaciada y centrada; la tipografía sube a escala editorial
gigante. El resultado se siente como OTRO producto con la misma paleta.

## Tokens y tipografía (pinned — no cambiar)

- Paleta `warm-dark-studio` como variables CSS en `src/app/globals.css`:
  `ink`, `shell`, `raised`, `line`, `spark`, `spark-hover`, `mist`, `paper`,
  `danger`, `ok`, `ink-text`.
- Fraunces (`font-display`) para títulos en escala editorial (`text-4xl` a
  `text-6xl`, tracking tight); Outfit (`font-sans`) para UI y datos; Source
  Serif 4 solo para cuerpo largo del editor.
- Sin glass, sin gradientes. Hairlines de `border-line` como separadores
  estructurales. Radios 12–16px. `tabular-nums` en todo dato numérico.
- Acento `spark` SOLO en acción primaria, selección y estado — nunca
  decorativo (se quitó la barra lateral `inset 2px` del canal activo).

## Estructura del shell

```
+----------------------------------------------------------+
| TopNav (h-14 lg:h-16, max-w-4xl):                         |
|   hamburguesa (movil) · marca → /workspaces · selector    |
|   de workspace (select nativo, bg-raised) · usuario       |
+----------------------------------------------------------+
| nav (lg only, border-t, h-11 links):                      |
|   Inicio · Documentos · Chat · Archivos · IA · Buscar ·   |
|   Estadísticas · Ajustes   (activo = text-paper +         |
|   subrayado spark h-0.5)                                  |
+----------------------------------------------------------+
| scroller (min-h-0 flex-1 overflow-y-auto pb-14 lg:pb-0)   |
|   children — cada página una columna editorial            |
|   (pageWide max-w-4xl / pageNarrow max-w-3xl)             |
+----------------------------------------------------------+
| MobileTabBar (lg:hidden, border-t, grid-cols-5):          |
|   Inicio · Documentos · Chat · Archivos · Más             |
+----------------------------------------------------------+
```

- `workspace-shell.tsx`: `h-dvh flex-col bg-ink`; el contenedor interior
  scrollea con `pb-14 lg:pb-0` (la barra inferior mobile lo cubre). El sheet
  lateral ("Navegación", `closeAt="lg"`) lista los 8 destinos + perfil +
  sign-out; se cierra al navegar (ajuste durante render, sin efecto).
- `nav-items.ts` es la única fuente de los nombres accesibles y sus iconos
  (`NAV_ITEMS`, `isNavActive`). No renombrar: la suite e2e los referencia.
- `split-nav.tsx` (chat/IA) y `left-sheet.tsx` se conservan: chrome funcional
  con el mismo vocabulario de tokens.

## Sistema de página (page-chrome)

- `pageWide` = `mx-auto w-full max-w-4xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14
  lg:pb-20`; `pageNarrow` = igual con `max-w-3xl`.
- `PageHeader`: `border-b pb-8 sm:pb-10`; `h1` Fraunces `text-4xl sm:text-5xl
  font-medium tracking-[-0.02em] text-balance`; descripción en `text-mist`.
- `Panel` es ahora una SECCIÓN con hairline (`border-t border-line pt-8
  sm:pt-10`) — ya no una tarjeta con fondo y radio.
- `EmptyState`: bloque editorial con `border-t pt-10 sm:pt-14`, título
  Fraunces `text-2xl sm:text-3xl`, sin caja punteada.

## Página a página

- **Home** (`/slug`): `pageNarrow`. Greeting Fraunces gigante
  (`text-5xl sm:text-6xl tracking-[-0.03em]`), sección "¿Qué vas a crear
  hoy?" con el botón primario (nuevo documento), "resumen" como ledger `<dl>`
  con hairlines (`divide-y`) y valores `tabular-nums` en Fraunces 3xl/4xl,
  y tres secuencias editoriales: documentos recientes (+ "Ver todos"),
  IA (+ "Preguntar"), movimiento reciente (+ "Ir al chat"). Filas con
  `-mx-4 px-4 py-5 sm:py-6 hover:bg-raised/50`.
- **Documentos / Archivos**: `pageWide`, cabecera con descripción literal
  original; listas como secuencia con hairlines (`divide-y border-b`). En
  archivos: tile de icono `h-9 w-9 bg-raised rounded-xl`, icono en `mist`
  (estado, no decorativo), badges de estado tintados (ok/danger/spark).
- **Buscar / Chat / IA / Estadísticas / Ajustes**: misma columna y hairlines.
  Stats en secciones apiladas (KPI con `border-t`, charts full-width,
  tablas con `tabular-nums`); el botón primario "Todo" conserva `spark`.
  Ajustes con secciones hairline y h2 Fraunces `text-2xl`.
- **Workspaces** (`/workspaces`): página de colección editorial — marca,
  h1 "Tus workspaces" (`text-4xl sm:text-5xl`), filas hairline (nombre
  Fraunces + slug + badge de rol), formulario de creación bajo `border-t`.

## Reglas de acento

- `spark`: acción primaria (nuevo documento, enviar, preguntar), selección
  (fila activa del sheet, tab activo), estado (badges "En vivo"/procesando).
- `mist`: texto secundario, metadata, íconos no interactivos.
- `paper`: texto principal. `danger`/`ok`: solo estado real (errores,
  synced).
- Hover: `hover:bg-raised/50` en filas, `hover:text-spark-hover` en títulos
  de enlace.

## Verificación del build

- `npx tsc --noEmit` → exit 0.
- `npx eslint` sobre todos los archivos tocados → exit 0 (1 warning
  pre-existente de `window.location.href` en el selector de workspace,
  trasladado de `sidebar.tsx` a `topnav.tsx` con el mismo comportamiento).
- `npx playwright test` → 5/5 (auth, landing, workspace flow completo).
- `impeccable detect --json` sobre los targets → `[]` (sin hallazgos).
- Capturas de revisión en `.impeccable/review/desktop.png` (1440) y
  `mobile.png` (390).

## Desviaciones conscientes del contrato

1. El contrato lista "Búsqueda"; se conserva el nombre accesible REAL
   "Buscar" que exige la suite e2e (nunca editar los tests).
2. Se agregó "Inicio" a la nav (conduce a la home del workspace); no existía
   en la sidebar previa.
3. La barra superior es de dos filas en desktop (identidad + índice de
   secciones) en vez de una sola franja, para alojar marca, selector de
   workspace, usuario y 8 destinos dentro del centrado `max-w-4xl`.
4. Mobile: bottom tab con 4 acciones + "Más" (hamburguesa con sheet), según
   la alternativa que el contrato deja a decisión de implementación.