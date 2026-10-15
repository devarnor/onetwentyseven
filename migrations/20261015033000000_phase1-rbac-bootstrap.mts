import type {
  MigrationBuilder,
  ColumnDefinitions,
} from 'node-pg-migrate';

export const shorthands:
  | ColumnDefinitions
  | undefined = undefined;

const bridgewayTenantId =
  '740582ac-665d-44e5-b19c-dfb5fbc6035c';

export async function up(
  pgm: MigrationBuilder,
): Promise<void> {
  // ---------------------------------------------------------------------------
  // GLOBAL PERMISSIONS
  // ---------------------------------------------------------------------------
  pgm.sql(`
    INSERT INTO permissions (
      id,
      code,
      name,
      description,
      metadata
    )
    VALUES
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e01',
        'platform.access',
        'Platform Access',
        'Access the OneTwentySeven platform.',
        '{"system":true}'::jsonb
      ),
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e02',
        'administration.users.manage',
        'Manage Users',
        'Create and manage tenant users and memberships.',
        '{"system":true}'::jsonb
      ),
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e03',
        'administration.roles.manage',
        'Manage Roles',
        'Manage tenant roles and role assignments.',
        '{"system":true}'::jsonb
      ),
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e04',
        'administration.tenant.manage',
        'Manage Tenant',
        'Manage tenant administration settings.',
        '{"system":true}'::jsonb
      ),
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e05',
        'growth.accounts.manage',
        'Manage Accounts',
        'Create and manage Growth account records.',
        '{"system":true}'::jsonb
      ),
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e06',
        'growth.organizations.manage',
        'Manage Organizations',
        'Create and manage Growth organizations.',
        '{"system":true}'::jsonb
      ),
      (
        '123b5d44-850d-4a43-9fa1-2cd469f77e07',
        'growth.facilities.manage',
        'Manage Facilities',
        'Create and manage Growth facilities.',
        '{"system":true}'::jsonb
      )
    ON CONFLICT (code)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      metadata = EXCLUDED.metadata;
  `);

  // ---------------------------------------------------------------------------
  // BRIDGEWAY SYSTEM ROLES
  // ---------------------------------------------------------------------------
  pgm.sql(`
    INSERT INTO roles (
      id,
      tenant_id,
      name,
      code,
      description,
      is_system
    )
    VALUES
      (
        '30ce1399-1c39-41ef-a2ce-b2df720ee001',
        '${bridgewayTenantId}',
        'Administrator',
        'administrator',
        'Full tenant administration and Phase 1 platform access.',
        true
      ),
      (
        '30ce1399-1c39-41ef-a2ce-b2df720ee002',
        '${bridgewayTenantId}',
        'Manager',
        'manager',
        'Operational management access without tenant administration.',
        true
      ),
      (
        '30ce1399-1c39-41ef-a2ce-b2df720ee003',
        '${bridgewayTenantId}',
        'User',
        'user',
        'Standard OneTwentySeven tenant access.',
        true
      )
    ON CONFLICT (tenant_id, code)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_system = EXCLUDED.is_system,
      updated_at = CURRENT_TIMESTAMP;
  `);

  // ---------------------------------------------------------------------------
  // ADMINISTRATOR -> ALL CURRENT PERMISSIONS
  // ---------------------------------------------------------------------------
  pgm.sql(`
    INSERT INTO role_permissions (
      role_id,
      permission_id
    )
    SELECT
      r.id,
      p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.tenant_id = '${bridgewayTenantId}'
      AND r.code = 'administrator'
      AND p.code IN (
        'platform.access',
        'administration.users.manage',
        'administration.roles.manage',
        'administration.tenant.manage',
        'growth.accounts.manage',
        'growth.organizations.manage',
        'growth.facilities.manage'
      )
    ON CONFLICT DO NOTHING;
  `);

  // ---------------------------------------------------------------------------
  // MANAGER -> OPERATIONAL GROWTH PERMISSIONS
  // ---------------------------------------------------------------------------
  pgm.sql(`
    INSERT INTO role_permissions (
      role_id,
      permission_id
    )
    SELECT
      r.id,
      p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.tenant_id = '${bridgewayTenantId}'
      AND r.code = 'manager'
      AND p.code IN (
        'platform.access',
        'growth.accounts.manage',
        'growth.organizations.manage',
        'growth.facilities.manage'
      )
    ON CONFLICT DO NOTHING;
  `);

  // ---------------------------------------------------------------------------
  // USER -> STANDARD PLATFORM ACCESS
  // ---------------------------------------------------------------------------
  pgm.sql(`
    INSERT INTO role_permissions (
      role_id,
      permission_id
    )
    SELECT
      r.id,
      p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.tenant_id = '${bridgewayTenantId}'
      AND r.code = 'user'
      AND p.code = 'platform.access'
    ON CONFLICT DO NOTHING;
  `);

  // ---------------------------------------------------------------------------
  // BOOTSTRAP MEMBERSHIP -> ADMINISTRATOR
  // ---------------------------------------------------------------------------
  pgm.sql(`
    INSERT INTO membership_roles (
      membership_id,
      role_id,
      tenant_id
    )
    SELECT
      tm.id,
      r.id,
      tm.tenant_id
    FROM tenant_memberships tm
    INNER JOIN roles r
      ON r.tenant_id = tm.tenant_id
     AND r.code = 'administrator'
    WHERE tm.tenant_id = '${bridgewayTenantId}'
      AND tm.status = 'active'
      AND tm.metadata->>'bootstrapMembership' = 'true'
    ON CONFLICT DO NOTHING;
  `);
}

export async function down(
  pgm: MigrationBuilder,
): Promise<void> {
  pgm.sql(`
    DELETE FROM membership_roles
    WHERE tenant_id = '${bridgewayTenantId}'
      AND role_id IN (
        SELECT id
        FROM roles
        WHERE tenant_id = '${bridgewayTenantId}'
          AND code IN (
            'administrator',
            'manager',
            'user'
          )
      );
  `);

  pgm.sql(`
    DELETE FROM role_permissions
    WHERE role_id IN (
      SELECT id
      FROM roles
      WHERE tenant_id = '${bridgewayTenantId}'
        AND code IN (
          'administrator',
          'manager',
          'user'
        )
    );
  `);

  pgm.sql(`
    DELETE FROM roles
    WHERE tenant_id = '${bridgewayTenantId}'
      AND code IN (
        'administrator',
        'manager',
        'user'
      );
  `);

  pgm.sql(`
    DELETE FROM permissions
    WHERE code IN (
      'platform.access',
      'administration.users.manage',
      'administration.roles.manage',
      'administration.tenant.manage',
      'growth.accounts.manage',
      'growth.organizations.manage',
      'growth.facilities.manage'
    );
  `);
}
