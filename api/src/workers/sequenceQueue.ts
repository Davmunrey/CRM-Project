/**
 * sequenceQueue — BullMQ scheduler + worker that advances sequence enrollments.
 *
 * Replaces the legacy in-process setInterval poller. A repeatable "tick" job
 * fires every 60s (a Redis-backed job scheduler), and a single Worker processes
 * each tick by running runSequenceCycle(). Because the schedule lives in Redis,
 * across multiple API replicas only one worker picks up each tick — no duplicate
 * processing (runSequenceCycle additionally claims rows FOR UPDATE SKIP LOCKED
 * as a second safety net).
 *
 * BullMQ requires dedicated ioredis connections with maxRetriesPerRequest: null
 * (the shared app `redis` uses maxRetriesPerRequest: 3 for request commands, and
 * BullMQ's blocking worker commands must not be capped). Queue and Worker get
 * their own connections per BullMQ guidance.
 */

import { Queue, Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import { env } from '../config/env.js'
import { runSequenceCycle } from './sequenceRunner.js'

const QUEUE_NAME = 'sequence-runner'
const SCHEDULER_ID = 'sequence-tick'
const TICK_MS = 60_000

let queueConn: Redis | null = null
let workerConn: Redis | null = null
let queue: Queue | null = null
let worker: Worker | null = null

function makeConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
}

export async function startSequenceQueue(): Promise<void> {
  if (queue !== null) {
    console.warn('[sequenceQueue] Already started — ignoring duplicate start')
    return
  }
  try {
    queueConn = makeConnection()
    workerConn = makeConnection()

    queue = new Queue(QUEUE_NAME, { connection: queueConn })

    // One tick at a time; each tick advances all due enrollments (≤50/cycle).
    worker = new Worker(QUEUE_NAME, async (_job: Job): Promise<void> => {
      await runSequenceCycle()
    }, { connection: workerConn, concurrency: 1 })

    worker.on('failed', (_job, err) => {
      console.error('[sequenceQueue] tick failed:', err)
    })

    // Idempotent repeatable schedule — survives restarts and is deduped across
    // replicas (only one scheduler with this id exists in Redis).
    await queue.upsertJobScheduler(
      SCHEDULER_ID,
      { every: TICK_MS },
      { name: 'tick', opts: { removeOnComplete: true, removeOnFail: 50 } },
    )

    // Fire one tick immediately so the first run doesn't wait a full interval.
    await queue.add('tick', {}, { removeOnComplete: true, removeOnFail: 50 })

    console.log('[sequenceQueue] Started (BullMQ repeatable tick every 60s)')
  } catch (err) {
    console.error('[sequenceQueue] Failed to start:', err)
  }
}

export async function stopSequenceQueue(): Promise<void> {
  try {
    await worker?.close()
    await queue?.close()
    await queueConn?.quit()
    await workerConn?.quit()
  } catch (err) {
    console.error('[sequenceQueue] Error during shutdown:', err)
  } finally {
    worker = null
    queue = null
    queueConn = null
    workerConn = null
  }
}
