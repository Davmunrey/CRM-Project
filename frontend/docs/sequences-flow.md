# Sequences flow editor

**Status:** Active  
**Owner:** Engineering  
**Last updated:** 2026-05-15  
**Canonical:** Yes (with code in `src/features/sequences-flow/` and `src/pages/Sequences.tsx`)

## Overview

Email sequences are edited in a **per-sequence studio**: a sidebar lists all sequences; the main pane shows a **React Flow** canvas (from `@xyflow/react`) plus an **inspector** for the selected node. Users add steps (email, wait, call task, LinkedIn task) or an **A/B split** node, connect edges manually, and **Save** to persist the graph and a derived linear `steps` projection for legacy consumers.

## Persistence (`email_sequences`)

| Column | Purpose |
|--------|---------|
| `steps` | `jsonb` array of `SequenceStep` (primary-path projection, backward compatible). |
| `flow_definition` | `jsonb` graph: `{ "flowVersion": 2, "nodes": [...], "edges": [...] }`. Null for rows created before migration; the app **derives** a graph from `steps` when null. |

Node payload:

- Step nodes: `type` is `email` \| `wait` \| `call_task` \| `linkedin_task`; `data` is a full `SequenceStep` (same `id` as the node).
- `ab_split` nodes: `data` is `{ "kind": "ab_split", "weightA": number, "weightB": number }` (percent-style weights; normalized on save).

Edges may set `sourceHandle` to `a` or `b` for branches leaving an `ab_split` node.

## Enrollments (`sequence_enrollments`)

| Column | Purpose |
|--------|---------|
| `current_step` | Legacy 0-based index along the **primary path** projection (still updated). |
| `current_node_id` | Active node id in `flow_definition` when resolved at enroll time. |
| `ab_variant` | `a` \| `b` when the contact was assigned a branch at an A/B split on entry. |

`computeEnrollmentStart` (in `src/features/sequences-flow/sequenceFlowEnrollment.ts`) picks the first actionable node and resolves an initial A/B branch using weights.

## Analytics (`sequence_step_events`)

Append-only table for future metrics (entered node, email sent, open, click, reply). **Not populated** by the stub worker; the UI shows an em dash placeholder on nodes until ingestion exists.

## Internationalization

All new UI strings live under `t.sequences.*` and nested `t.sequences.flow.*`. Source strings are **English** in `src/i18n/en.ts`; add translations in `es.ts` and `pt.ts`. Locales that spread `en` (`de`, `fr`, `it`) inherit English for any key not overridden.

| Key area | Examples |
|----------|------------|
| Tabs | `sequences.tabFlow`, `sequences.tabEnrolled` |
| Toolbar / canvas | `sequences.flow.toolbarAdd`, `sequences.flow.canvasHint`, `sequences.flow.addAbSplit` |
| Inspector | `sequences.flow.inspectorTitle`, `sequences.flow.abWeightA`, `sequences.flow.waitInspectorHint` |
| Validation | `sequences.flow.validationEmpty`, `sequences.flow.validationCycle` |
| Toasts | `sequences.toastFlowSaved`, `sequences.defaultNewSequenceName` |

Run `npm run i18n:lint` after changing keys.

## Execution worker (planned)

Automatic step advancement is **not** implemented in the app runtime. A scheduled job should:

1. Load active enrollments with `next_step_at` due.
2. Walk `flow_definition` from `current_node_id` (or entry), respecting waits and recorded `ab_variant`.
3. Queue email sends / create tasks and append `sequence_step_events`.

**Edge Function (not implemented):** `supabase/functions/sequence-advance/index.ts` returns **HTTP 501** with JSON `{ ok: false, error: 'not_implemented', ... }` until the worker is built. Schedulers must not treat 501 as success. Deploy with `supabase functions deploy sequence-advance` and attach to **pg_cron** or an external scheduler when ready.

## Related code

- UI: `src/pages/Sequences.tsx`, `src/features/sequences-flow/SequenceFlowStudio.tsx`
- Converters: `src/features/sequences-flow/sequenceFlowConverters.ts`
- Store: `src/store/sequencesStore.ts`
- Migration: `supabase/migrations/20260422120000_sequences_flow_and_events.sql`
- Unit tests: `tests/sequenceFlowConverters.test.ts`
