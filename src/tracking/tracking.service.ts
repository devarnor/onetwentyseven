import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';

export interface MutationTrackingInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  version: number;
  source?: string | null;
  actorUserId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TrackingService {
  async recordMutation(
    client: PoolClient,
    input: MutationTrackingInput,
  ): Promise<void> {
    const auditId = randomUUID();
    const lineageId = randomUUID();

    await client.query(
      `
        INSERT INTO audit_events (
          id,
          tenant_id,
          actor_user_id,
          entity_type,
          entity_id,
          action,
          source,
          before_data,
          after_data,
          metadata
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8::jsonb, $9::jsonb, $10::jsonb
        )
      `,
      [
        auditId,
        input.tenantId,
        input.actorUserId ?? null,
        input.entityType,
        input.entityId,
        input.action,
        input.source ?? '127-api',
        input.beforeData === undefined
          ? null
          : JSON.stringify(input.beforeData),
        input.afterData === undefined
          ? null
          : JSON.stringify(input.afterData),
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    await client.query(
      `
        INSERT INTO record_lineage (
          id,
          tenant_id,
          entity_type,
          entity_id,
          lineage_type,
          source_system,
          source_record_id,
          version,
          evidence,
          created_by_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9::jsonb, $10
        )
      `,
      [
        lineageId,
        input.tenantId,
        input.entityType,
        input.entityId,
        input.action,
        input.source ?? '127-api',
        input.entityId,
        input.version,
        JSON.stringify({
          action: input.action,
          version: input.version,
          ...(input.metadata ?? {}),
        }),
        input.actorUserId ?? null,
      ],
    );
  }
}
