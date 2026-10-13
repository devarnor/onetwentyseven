import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex(
    'tenant_memberships',
    ['primary_organization_id'],
    { name: 'tenant_memberships_primary_organization_id_index' },
  );

  pgm.createIndex(
    'membership_roles',
    ['role_id'],
    { name: 'membership_roles_role_id_index' },
  );

  pgm.createIndex(
    'role_permissions',
    ['permission_id'],
    { name: 'role_permissions_permission_id_index' },
  );

  pgm.createIndex(
    'audit_events',
    ['actor_user_id'],
    { name: 'audit_events_actor_user_id_index' },
  );

  pgm.createIndex(
    'record_lineage',
    ['created_by_user_id'],
    { name: 'record_lineage_created_by_user_id_index' },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex(
    'record_lineage',
    ['created_by_user_id'],
    { name: 'record_lineage_created_by_user_id_index' },
  );

  pgm.dropIndex(
    'audit_events',
    ['actor_user_id'],
    { name: 'audit_events_actor_user_id_index' },
  );

  pgm.dropIndex(
    'role_permissions',
    ['permission_id'],
    { name: 'role_permissions_permission_id_index' },
  );

  pgm.dropIndex(
    'membership_roles',
    ['role_id'],
    { name: 'membership_roles_role_id_index' },
  );

  pgm.dropIndex(
    'tenant_memberships',
    ['primary_organization_id'],
    { name: 'tenant_memberships_primary_organization_id_index' },
  );
}
