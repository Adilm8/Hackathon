/**
 * PostgreSQL schema (docs/SPEC.md 6.3). The family's plan and history are one
 * validated JSON document; what the server must trust or count has its own table.
 * Change it here, then run `npm run db:generate` to write a new SQL migration in drizzle/.
 */
import { sql } from 'drizzle-orm';
import {
  bigserial, check, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid,
} from 'drizzle-orm/pg-core';
import type { FamilyDoc } from '../engine/types';

export const families = pgTable(
  'families',
  {
    id: uuid('id').primaryKey(),
    kind: text('kind', { enum: ['real', 'sample'] }).notNull(),
    /** Hash of the "use on another device" code; the code itself is never stored. */
    restoreHash: text('restore_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('families_kind_check', sql`${t.kind} in ('real', 'sample')`),
    index('families_restore_hash').on(t.restoreHash),
    index('families_last_seen_at').on(t.lastSeenAt),
  ],
);

/** The FamilyDoc, one row per family. First name or nickname only, never a surname. */
export const familyState = pgTable('family_state', {
  familyId: uuid('family_id')
    .primaryKey()
    .references(() => families.id, { onDelete: 'cascade' }),
  doc: jsonb('doc').$type<FamilyDoc>().notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Paid access, written only by the server (10.4). */
export const entitlements = pgTable(
  'entitlements',
  {
    id: uuid('id').primaryKey(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    plan: text('plan', { enum: ['event', 'year', 'month'] }).notNull(),
    eventId: text('event_id'),
    /** 'demo:<family id>' for demo access. */
    stripeSessionId: text('stripe_session_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    /** 'active' | 'canceled' | 'expired' | 'demo' (sample families only) */
    status: text('status', { enum: ['active', 'canceled', 'expired', 'demo'] }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('entitlements_plan_check', sql`${t.plan} in ('event', 'year', 'month')`),
    index('entitlements_family_id').on(t.familyId),
  ],
);

/** Usage and cost log; never any text. */
export const llmCalls = pgTable(
  'llm_calls',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    /** 'chapter' | 'answer' | 'ritual' | 'eval' */
    route: text('route', { enum: ['chapter', 'answer', 'ritual', 'eval'] }).notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull(),
    /** 'ok' | 'fallback' | 'blocked' | 'timeout' | 'error' */
    outcome: text('outcome', { enum: ['ok', 'fallback', 'blocked', 'timeout', 'error'] }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('llm_calls_created_at').on(t.createdAt)],
);

export type FamilyRow = typeof families.$inferSelect;
export type FamilyStateRow = typeof familyState.$inferSelect;
export type EntitlementRow = typeof entitlements.$inferSelect;
export type LlmCallRow = typeof llmCalls.$inferInsert;
