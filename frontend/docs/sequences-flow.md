# Sequences flow editor

**Status:** Active  
**Owner:** Engineering  
**Last updated:** 2026-05-25  
**Canonical:** Yes (with code in `frontend/src/features/sequences-flow/`, `frontend/src/pages/Sequences.tsx`, and `api/src/workers/sequenceRunner.ts`)

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

## Sequence runner worker

The **sequence runner** is a background job that automatically advances enrolled contacts through their email sequences. It runs continuously in the API process and polls every 60 seconds.

### How it works

1. **Polling**: Every 60 seconds, the runner queries for enrollments with `next_step_at <= now()` (up to 50 per tick)
2. **Step execution**: For each enrollment:
   - Resolves the current node from `flow_definition` using `current_node_id`
   - If it is an **email** step: sends email via organization SMTP settings
   - If it is a **wait** step: calculates next execution time, skips to next step
   - If it is an **A/B split**: uses stored `ab_variant` to branch correctly
3. **Error handling**: Per-enrollment errors are logged (no cascade failure); enrollment moves to error state; runner continues with next enrollment
4. **Advancement**: On success, enrollments advance to the next step; `next_step_at` is recalculated based on step type (email sends immediately, wait steps use configured duration)

### Starting the runner

The sequence runner **starts automatically** on API boot. Check logs for:
```
[startup] Sequence runner started — polling every 60s
```

### Manual trigger (for testing)

You can manually trigger the runner outside of the poll cycle:

```bash
curl -X POST http://localhost:3001/internal/sequences/run \
  -H "x-internal-key: $INTERNAL_KEY" \
  -H "Content-Type: application/json"
```

Response:
```json
{
  "processed": 12,
  "errors": 1
}
```

### Monitoring

The runner exports metrics to Prometheus:

- `n0crm_sequence_enrollments_processed_total` — Total enrollments advanced (counter)
- `n0crm_sequence_runner_ticks_total` — Total runner ticks (counter)
- `n0crm_sequence_runner_tick_duration_seconds` — Tick duration histogram (for performance tracking)
- `n0crm_sequence_step_send_failures_total` — Email send failures (counter)

View these in Grafana or query Prometheus directly:
```
rate(n0crm_sequence_enrollments_processed_total[1m])  # enrollments per minute
```

### Implementation details

- **Code:** `api/src/workers/sequenceRunner.ts`
- **Exports:** `startSequenceRunner()` and `stopSequenceRunner()` functions
- **Integrations:**
  - Reads from `sequence_enrollments` and `email_sequences` tables
  - Uses org-scoped SMTP config from `org_smtp_settings`
  - Appends to `sequence_step_events` (append-only audit trail)
  - Respects RLS policies (queries filtered by `organization_id`)

### Troubleshooting

**Runner not advancing enrollments:**
1. Check API logs for errors: `[sequence-runner] ERROR ...`
2. Verify `SMTP_HOST` and org SMTP settings are configured
3. Test with `POST /internal/sequences/run` — if manual trigger fails, check permissions and INTERNAL_KEY
4. Ensure `sequence_enrollments.next_step_at` is in the past for test enrollments

## Related code

- UI: `frontend/src/pages/Sequences.tsx`, `frontend/src/features/sequences-flow/SequenceFlowStudio.tsx`
- Converters: `frontend/src/features/sequences-flow/sequenceFlowConverters.ts`
- Store: `frontend/src/store/sequencesStore.ts`
- Migration: `api/migrations/20260422120000_sequences_flow_and_events.sql`
- Unit tests: `frontend/tests/sequenceFlowConverters.test.ts`
