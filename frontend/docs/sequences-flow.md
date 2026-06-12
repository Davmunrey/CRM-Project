# Sequences flow editor

**Status:** Active  
**Owner:** Engineering  
**Last updated:** 2026-06-11  
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
| `current_step` | 0-based index into the `steps` array; the runner advances this on every tick. |
| `current_node_id` | Reserved — populated at enroll time by `computeEnrollmentStart` for future graph-aware runners; **not read by the current worker**. |
| `ab_variant` | Reserved — set at enroll time for future A/B branch tracking; **not read by the current worker**. |

`computeEnrollmentStart` (in `src/features/sequences-flow/sequenceFlowEnrollment.ts`) picks the first actionable node and resolves an initial A/B branch using weights.

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

1. **Polling**: Every 60 seconds, the runner queries `sequence_enrollments` for rows with `status = 'active'` and `next_step_at <= NOW()`, fetching up to 50 per tick ordered by `next_step_at ASC`.
2. **Row locking**: Each enrollment is claimed with `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction — a concurrent tick or manual trigger will skip a row already held by another worker rather than double-sending.
3. **Step execution**: The step at `current_step` (0-based index) is read from the `steps` jsonb array on `email_sequences`:
   - **`email` step**: renders subject/body with `{{variable}}` substitution (first\_name, last\_name, company), optionally loads an email template by `templateId`, loads the org's SMTP config, and sends via `sendEmail()`. On success, an `activities` row and an `audit_log` row (`sequence_email_sent`) are written. On send failure, the enrollment is set to `status = 'error'` and an `audit_log` row (`sequence_email_failed`) is written.
   - **`wait` step (or any unrecognised type)**: no email is sent; the enrollment advances immediately.
4. **Advancement**: `current_step` is incremented and `next_step_at` is set to `NOW() + <next step's delay_days> days`. When there is no next step the enrollment is marked `completed`.
5. **Error safety**: Per-enrollment errors are caught; the runner logs the error and continues to the next enrollment without cascading.

### Starting the runner

The sequence runner **starts automatically** on API boot and fires one initial tick immediately (so it does not wait a full 60 s on startup). Check logs for:
```
[sequenceRunner] Starting (tick every 60s)
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
  "ok": true,
  "message": "Sequence cycle completed",
  "elapsedMs": 143
}
```

### Implementation details

- **Code:** `api/src/workers/sequenceRunner.ts`
- **Exports:** `startSequenceRunner()` and `stopSequenceRunner()` functions
- **Integrations:**
  - Reads from `sequence_enrollments` and `email_sequences` tables
  - Uses org-scoped SMTP config from `org_smtp_settings`
  - Writes activity records to `activities` and audit entries to `audit_log`
  - All queries are filtered by `organization_id` (app-layer tenant scoping)

### Troubleshooting

**Runner not advancing enrollments:**
1. Check API logs for errors: `[sequenceRunner] ERROR ...` or `[sequenceRunner] Unexpected error ...`
2. Verify org SMTP settings are configured (Settings > Email) — missing SMTP causes the step to be skipped and enrollment set to `error`
3. Test with `POST /internal/sequences/run` — on success you get `{ ok: true, message: "...", elapsedMs: N }`; on failure check `INTERNAL_KEY` env var and API logs
4. Ensure `sequence_enrollments.next_step_at` is in the past and `status = 'active'` for test enrollments

## Related code

- UI: `frontend/src/pages/Sequences.tsx`, `frontend/src/features/sequences-flow/SequenceFlowStudio.tsx`
- Converters: `frontend/src/features/sequences-flow/sequenceFlowConverters.ts`
- Store: `frontend/src/store/sequencesStore.ts`
- Schema: `api/migrations/001_schema.sql` (tables `email_sequences`, `sequence_enrollments`)
- Unit tests: `frontend/tests/sequenceFlowConverters.test.ts`
