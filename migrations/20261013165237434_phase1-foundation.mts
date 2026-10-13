import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {

  // ---------------------------------------------------------------------------
  // TENANTS
  // ---------------------------------------------------------------------------
  pgm.createTable('tenants', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    slug: {
      type: 'varchar(120)',
      notNull: true,
      unique: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    external_id: {
      type: 'varchar(255)',
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // ---------------------------------------------------------------------------
  // ORGANIZATIONS
  // ---------------------------------------------------------------------------
  pgm.createTable('organizations', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    parent_organization_id: {
      type: 'uuid',
      references: 'organizations',
      onDelete: 'SET NULL',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    legal_name: {
      type: 'varchar(255)',
    },
    organization_type: {
      type: 'varchar(100)',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    external_id: {
      type: 'varchar(255)',
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('organizations', ['tenant_id']);
  pgm.createIndex('organizations', ['parent_organization_id']);

  // ---------------------------------------------------------------------------
  // USERS
  // Global identity record. Tenant access is controlled through memberships.
  // ---------------------------------------------------------------------------
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    entra_object_id: {
      type: 'varchar(255)',
      unique: true,
    },
    email: {
      type: 'varchar(320)',
      notNull: true,
      unique: true,
    },
    display_name: {
      type: 'varchar(255)',
    },
    first_name: {
      type: 'varchar(150)',
    },
    last_name: {
      type: 'varchar(150)',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // ---------------------------------------------------------------------------
  // TENANT MEMBERSHIPS
  // ---------------------------------------------------------------------------
  pgm.createTable('tenant_memberships', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    primary_organization_id: {
      type: 'uuid',
      references: 'organizations',
      onDelete: 'SET NULL',
    },
    job_title: {
      type: 'varchar(255)',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint(
    'tenant_memberships',
    'uq_tenant_memberships_tenant_user',
    {
      unique: ['tenant_id', 'user_id'],
    },
  );

  pgm.createIndex('tenant_memberships', ['tenant_id']);
  pgm.createIndex('tenant_memberships', ['user_id']);

  // ---------------------------------------------------------------------------
  // ROLES
  // ---------------------------------------------------------------------------
  pgm.createTable('roles', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'varchar(150)',
      notNull: true,
    },
    code: {
      type: 'varchar(150)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    is_system: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('roles', 'uq_roles_tenant_code', {
    unique: ['tenant_id', 'code'],
  });

  pgm.createIndex('roles', ['tenant_id']);

  // ---------------------------------------------------------------------------
  // PERMISSIONS
  // ---------------------------------------------------------------------------
  pgm.createTable('permissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    code: {
      type: 'varchar(150)',
      notNull: true,
      unique: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // ---------------------------------------------------------------------------
  // ROLE -> PERMISSION
  // ---------------------------------------------------------------------------
  pgm.createTable('role_permissions', {
    role_id: {
      type: 'uuid',
      notNull: true,
      references: 'roles',
      onDelete: 'CASCADE',
    },
    permission_id: {
      type: 'uuid',
      notNull: true,
      references: 'permissions',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('role_permissions', 'pk_role_permissions', {
    primaryKey: ['role_id', 'permission_id'],
  });

  // ---------------------------------------------------------------------------
  // MEMBERSHIP -> ROLE
  // ---------------------------------------------------------------------------
  pgm.createTable('membership_roles', {
    membership_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenant_memberships',
      onDelete: 'CASCADE',
    },
    role_id: {
      type: 'uuid',
      notNull: true,
      references: 'roles',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('membership_roles', 'pk_membership_roles', {
    primaryKey: ['membership_id', 'role_id'],
  });

  // ---------------------------------------------------------------------------
  // FACILITIES
  // ---------------------------------------------------------------------------
  pgm.createTable('facilities', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    organization_id: {
      type: 'uuid',
      references: 'organizations',
      onDelete: 'SET NULL',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    facility_type: {
      type: 'varchar(100)',
    },
    address_line1: {
      type: 'varchar(255)',
    },
    address_line2: {
      type: 'varchar(255)',
    },
    city: {
      type: 'varchar(150)',
    },
    state_region: {
      type: 'varchar(150)',
    },
    postal_code: {
      type: 'varchar(30)',
    },
    country_code: {
      type: 'varchar(2)',
    },
    latitude: {
      type: 'numeric(10,7)',
    },
    longitude: {
      type: 'numeric(10,7)',
    },
    timezone: {
      type: 'varchar(100)',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    external_id: {
      type: 'varchar(255)',
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('facilities', ['tenant_id']);
  pgm.createIndex('facilities', ['organization_id']);

  // ---------------------------------------------------------------------------
  // AUDIT EVENTS
  // Immutable security/business activity history.
  // ---------------------------------------------------------------------------
  pgm.createTable('audit_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    actor_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    entity_type: {
      type: 'varchar(150)',
      notNull: true,
    },
    entity_id: {
      type: 'uuid',
    },
    action: {
      type: 'varchar(150)',
      notNull: true,
    },
    source: {
      type: 'varchar(150)',
    },
    request_id: {
      type: 'varchar(255)',
    },
    before_data: {
      type: 'jsonb',
    },
    after_data: {
      type: 'jsonb',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    occurred_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('audit_events', ['tenant_id']);
  pgm.createIndex('audit_events', ['tenant_id', 'occurred_at']);
  pgm.createIndex('audit_events', ['entity_type', 'entity_id']);

  // ---------------------------------------------------------------------------
  // RECORD LINEAGE
  // Digital-thread foundation for tracing records across the 127 lifecycle.
  // ---------------------------------------------------------------------------
  pgm.createTable('record_lineage', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    entity_type: {
      type: 'varchar(150)',
      notNull: true,
    },
    entity_id: {
      type: 'uuid',
      notNull: true,
    },
    parent_entity_type: {
      type: 'varchar(150)',
    },
    parent_entity_id: {
      type: 'uuid',
    },
    lineage_type: {
      type: 'varchar(100)',
      notNull: true,
      default: 'derived_from',
    },
    source_system: {
      type: 'varchar(150)',
    },
    source_record_id: {
      type: 'varchar(255)',
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    evidence: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('record_lineage', ['tenant_id']);
  pgm.createIndex('record_lineage', ['entity_type', 'entity_id']);
  pgm.createIndex('record_lineage', ['parent_entity_type', 'parent_entity_id']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('record_lineage');
  pgm.dropTable('audit_events');
  pgm.dropTable('facilities');
  pgm.dropTable('membership_roles');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
  pgm.dropTable('tenant_memberships');
  pgm.dropTable('users');
  pgm.dropTable('organizations');
  pgm.dropTable('tenants');
}
