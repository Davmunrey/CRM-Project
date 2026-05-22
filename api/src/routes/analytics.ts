import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client.js'

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  // ── GET /analytics/summary ─────────────────────────────────────────────────
  app.get('/summary', async (req, reply) => {
    const query = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { from, to } = query.data
    const orgId = req.user.org

    const fromFrag = from ? db`AND created_at >= ${from}` : db``
    const toFrag = to ? db`AND created_at <= ${to}` : db``

    const [row] = await db`
      SELECT
        COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')), 0) AS pipeline,
        COALESCE(SUM(value) FILTER (WHERE stage = 'closed_won'), 0) AS won,
        COALESCE(SUM(value) FILTER (WHERE stage = 'closed_lost'), 0) AS lost_value,
        COUNT(*) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')) AS active_deals,
        COUNT(*) FILTER (WHERE stage = 'closed_won') AS won_deals,
        COUNT(*) FILTER (WHERE stage = 'closed_lost') AS lost_deals,
        COUNT(*) AS total_deals
      FROM deals
      WHERE organization_id = ${orgId} ${fromFrag} ${toFrag}
    `

    const wonDeals = Number(row?.wonDeals ?? 0)
    const lostDeals = Number(row?.lostDeals ?? 0)
    const closedDeals = wonDeals + lostDeals
    const wonValue = Number(row?.won ?? 0)

    return reply.send({
      pipeline: Number(row?.pipeline ?? 0),
      won: wonValue,
      lostValue: Number(row?.lostValue ?? 0),
      activeDeals: Number(row?.activeDeals ?? 0),
      wonDeals,
      lostDeals,
      totalDeals: Number(row?.totalDeals ?? 0),
      conversionRate: closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0,
      avgDealSize: wonDeals > 0 ? wonValue / wonDeals : 0,
    })
  })

  // ── GET /analytics/deals-by-stage ──────────────────────────────────────────
  app.get('/deals-by-stage', async (req, reply) => {
    const query = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { from, to } = query.data
    const orgId = req.user.org

    const fromFrag = from ? db`AND d.created_at >= ${from}` : db``
    const toFrag = to ? db`AND d.created_at <= ${to}` : db``

    // probability lives in pipelines.stages JSONB — look it up per deal
    const rows = await db`
      SELECT
        d.stage,
        COUNT(*)::int AS count,
        COALESCE(SUM(d.value), 0) AS value,
        COALESCE(SUM(d.value * COALESCE(
          (SELECT (elem->>'probability')::numeric / 100.0
           FROM pipelines pl
           JOIN LATERAL jsonb_array_elements(pl.stages) elem ON TRUE
           WHERE pl.id = d.pipeline_id AND elem->>'name' = d.stage
           LIMIT 1),
          0.5
        )), 0) AS weighted
      FROM deals d
      WHERE d.organization_id = ${orgId} ${fromFrag} ${toFrag}
      GROUP BY d.stage
      ORDER BY d.stage
    `

    return reply.send({
      data: rows.map((r) => ({
        stage: r.stage as string,
        count: Number(r.count),
        value: Number(r.value),
        weighted: Number(r.weighted ?? 0),
      })),
    })
  })

  // ── GET /analytics/revenue-by-month ───────────────────────────────────────
  app.get('/revenue-by-month', async (req, reply) => {
    const query = z.object({
      months: z.coerce.number().min(1).max(24).default(12),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { months } = query.data
    const orgId = req.user.org

    // Generate a series of months so months with no revenue still appear
    const rows = await db`
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW() - (${months - 1} || ' months')::INTERVAL),
          DATE_TRUNC('month', NOW()),
          '1 month'::INTERVAL
        ) AS month_start
      ),
      won_deals AS (
        SELECT
          DATE_TRUNC('month', updated_at) AS month_start,
          SUM(value) AS revenue,
          COUNT(*) AS deal_count
        FROM deals
        WHERE organization_id = ${orgId}
          AND stage = 'closed_won'
          AND updated_at >= DATE_TRUNC('month', NOW() - (${months - 1} || ' months')::INTERVAL)
        GROUP BY DATE_TRUNC('month', updated_at)
      )
      SELECT
        TO_CHAR(m.month_start, 'YYYY-MM') AS month,
        COALESCE(w.revenue, 0) AS revenue,
        COALESCE(w.deal_count, 0) AS deal_count
      FROM months m
      LEFT JOIN won_deals w ON w.month_start = m.month_start
      ORDER BY m.month_start ASC
    `

    return reply.send({
      data: rows.map((r) => ({
        month: r.month as string,
        revenue: Number(r.revenue),
        dealCount: Number(r.dealCount),
      })),
    })
  })

  // ── GET /analytics/activities-by-type ─────────────────────────────────────
  app.get('/activities-by-type', async (req, reply) => {
    const query = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { from, to } = query.data
    const orgId = req.user.org

    const fromFrag = from ? db`AND created_at >= ${from}` : db``
    const toFrag = to ? db`AND created_at <= ${to}` : db``

    const rows = await db`
      SELECT type, COUNT(*)::int AS count
      FROM activities
      WHERE organization_id = ${orgId} ${fromFrag} ${toFrag}
      GROUP BY type
      ORDER BY count DESC
    `

    return reply.send({ data: rows.map((r) => ({ type: r.type as string, count: Number(r.count) })) })
  })

  // ── GET /analytics/contacts-by-source ─────────────────────────────────────
  app.get('/contacts-by-source', async (req, reply) => {
    const orgId = req.user.org

    const rows = await db`
      SELECT COALESCE(source, 'other') AS source, COUNT(*)::int AS count
      FROM contacts
      WHERE organization_id = ${orgId}
      GROUP BY source
      ORDER BY count DESC
    `

    return reply.send({ data: rows.map((r) => ({ source: r.source as string, count: Number(r.count) })) })
  })

  // ── GET /analytics/sales-reps ──────────────────────────────────────────────
  app.get('/sales-reps', async (req, reply) => {
    const query = z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { from, to } = query.data
    const orgId = req.user.org

    const fromFrag = from ? db`AND created_at >= ${from}` : db``
    const toFrag = to ? db`AND created_at <= ${to}` : db``

    const rows = await db`
      WITH filtered_deals AS (
        SELECT * FROM deals
        WHERE organization_id = ${orgId} ${fromFrag} ${toFrag}
      )
      SELECT
        u.id AS user_id,
        u.name,
        COUNT(d.id) FILTER (WHERE d.stage = 'closed_won')::int AS won_deals,
        COALESCE(SUM(d.value) FILTER (WHERE d.stage = 'closed_won'), 0) AS won_value,
        COALESCE(SUM(d.value) FILTER (WHERE d.stage NOT IN ('closed_won','closed_lost')), 0) AS pipeline_value,
        COUNT(d.id) FILTER (WHERE d.stage NOT IN ('closed_won','closed_lost'))::int AS active_deals,
        COUNT(d.id) FILTER (WHERE d.stage IN ('closed_won','closed_lost'))::int AS closed_deals,
        (
          SELECT COUNT(*)::int FROM activities a
          WHERE a.organization_id = ${orgId} AND a.created_by = u.name
        ) AS activities_count
      FROM users u
      LEFT JOIN filtered_deals d ON d.owner_id = u.id
      WHERE u.organization_id = ${orgId} AND u.is_active = true
      GROUP BY u.id, u.name
      ORDER BY won_value DESC
    `

    return reply.send({
      data: rows.map((r) => {
        const wonDeals = Number(r.wonDeals)
        const closedDeals = Number(r.closedDeals)
        return {
          userId: r.userId as string,
          name: r.name as string,
          wonDeals,
          wonValue: Number(r.wonValue),
          pipelineValue: Number(r.pipelineValue),
          activeDeals: Number(r.activeDeals),
          winRate: closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0,
          activitiesCount: Number(r.activitiesCount),
        }
      }),
    })
  })

  // ── GET /analytics/forecast ────────────────────────────────────────────────
  app.get('/forecast', async (req, reply) => {
    const query = z.object({
      months: z.coerce.number().min(1).max(12).default(3),
    }).safeParse(req.query)
    if (!query.success) return reply.code(400).send({ error: 'Invalid query' })

    const { months } = query.data
    const orgId = req.user.org

    // Generate series for next N months so empty months still appear
    const rows = await db`
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
          DATE_TRUNC('month', NOW() + (${months} || ' months')::INTERVAL),
          '1 month'::INTERVAL
        ) AS month_start
      ),
      pipeline AS (
        SELECT
          DATE_TRUNC('month', d.expected_close_date) AS month_start,
          SUM(d.value * COALESCE(
            (SELECT (elem->>'probability')::numeric / 100.0
             FROM pipelines pl
             JOIN LATERAL jsonb_array_elements(pl.stages) elem ON TRUE
             WHERE pl.id = d.pipeline_id AND elem->>'name' = d.stage
             LIMIT 1),
            0.5
          )) AS weighted,
          COUNT(*)::int AS deal_count
        FROM deals d
        WHERE d.organization_id = ${orgId}
          AND d.stage NOT IN ('closed_won','closed_lost')
          AND d.expected_close_date >= DATE_TRUNC('month', NOW() + INTERVAL '1 month')
          AND d.expected_close_date < DATE_TRUNC('month', NOW() + (${months + 1} || ' months')::INTERVAL)
        GROUP BY DATE_TRUNC('month', d.expected_close_date)
      )
      SELECT
        TO_CHAR(m.month_start, 'YYYY-MM') AS month,
        COALESCE(p.weighted, 0) AS weighted,
        COALESCE(p.deal_count, 0) AS deal_count
      FROM month_series m
      LEFT JOIN pipeline p ON p.month_start = m.month_start
      ORDER BY m.month_start ASC
    `

    return reply.send({
      data: rows.map((r) => ({
        month: r.month as string,
        weighted: Number(r.weighted),
        dealCount: Number(r.dealCount),
      })),
    })
  })
}
