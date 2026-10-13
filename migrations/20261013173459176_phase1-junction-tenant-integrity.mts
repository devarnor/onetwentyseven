import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {

  // ===========================================================================
  // PARENT COMPOSITE KEYS
  // Required for tenant-aware junction foreign keys.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "tenant_memberships"
      ADD CONSTRAINT "uq_tenant_memberships_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "roles"
      ADD CONSTRAINT "uq_roles_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "activities"
      ADD CONSTRAINT "uq_activities_tenant_pk"
      UNIQUE ("tenant_id", "id");
  `);

  // ===========================================================================
  // MEMBERSHIP_ROLES
  // Add tenant ownership and backfill from tenant_memberships.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "membership_roles"
      ADD COLUMN "tenant_id" uuid;

    UPDATE "membership_roles" mr
       SET "tenant_id" = tm."tenant_id"
      FROM "tenant_memberships" tm
     WHERE tm."id" = mr."membership_id";

    ALTER TABLE "membership_roles"
      ALTER COLUMN "tenant_id" SET NOT NULL;
  `);

  pgm.createIndex(
    'membership_roles',
    ['tenant_id'],
    { name: 'membership_roles_tenant_id_index' },
  );

  pgm.sql(`
    ALTER TABLE "membership_roles"
      ADD CONSTRAINT "fk_membership_roles_membership_same_tenant"
      FOREIGN KEY ("tenant_id", "membership_id")
      REFERENCES "tenant_memberships" ("tenant_id", "id")
      ON DELETE CASCADE;

    ALTER TABLE "membership_roles"
      ADD CONSTRAINT "fk_membership_roles_role_same_tenant"
      FOREIGN KEY ("tenant_id", "role_id")
      REFERENCES "roles" ("tenant_id", "id")
      ON DELETE CASCADE;
  `);

  // ===========================================================================
  // ACTIVITY_CONTACTS
  // Add tenant ownership and backfill from activities.
  // contacts already has uq_contacts_tenant_pk from the previous migration.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "activity_contacts"
      ADD COLUMN "tenant_id" uuid;

    UPDATE "activity_contacts" ac
       SET "tenant_id" = a."tenant_id"
      FROM "activities" a
     WHERE a."id" = ac."activity_id";

    ALTER TABLE "activity_contacts"
      ALTER COLUMN "tenant_id" SET NOT NULL;
  `);

  pgm.createIndex(
    'activity_contacts',
    ['tenant_id'],
    { name: 'activity_contacts_tenant_id_index' },
  );

  pgm.sql(`
    ALTER TABLE "activity_contacts"
      ADD CONSTRAINT "fk_activity_contacts_activity_same_tenant"
      FOREIGN KEY ("tenant_id", "activity_id")
      REFERENCES "activities" ("tenant_id", "id")
      ON DELETE CASCADE;

    ALTER TABLE "activity_contacts"
      ADD CONSTRAINT "fk_activity_contacts_contact_same_tenant"
      FOREIGN KEY ("tenant_id", "contact_id")
      REFERENCES "contacts" ("tenant_id", "id")
      ON DELETE CASCADE;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {

  // Remove tenant-aware junction foreign keys.
  pgm.sql(`
    ALTER TABLE "activity_contacts"
      DROP CONSTRAINT IF EXISTS "fk_activity_contacts_contact_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_activity_contacts_activity_same_tenant";

    ALTER TABLE "membership_roles"
      DROP CONSTRAINT IF EXISTS "fk_membership_roles_role_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_membership_roles_membership_same_tenant";
  `);

  pgm.dropIndex(
    'activity_contacts',
    ['tenant_id'],
    { name: 'activity_contacts_tenant_id_index' },
  );

  pgm.dropIndex(
    'membership_roles',
    ['tenant_id'],
    { name: 'membership_roles_tenant_id_index' },
  );

  pgm.sql(`
    ALTER TABLE "activity_contacts"
      DROP COLUMN "tenant_id";

    ALTER TABLE "membership_roles"
      DROP COLUMN "tenant_id";
  `);

  // Remove composite parent keys last.
  pgm.sql(`
    ALTER TABLE "activities"
      DROP CONSTRAINT IF EXISTS "uq_activities_tenant_pk";

    ALTER TABLE "roles"
      DROP CONSTRAINT IF EXISTS "uq_roles_tenant_pk";

    ALTER TABLE "tenant_memberships"
      DROP CONSTRAINT IF EXISTS "uq_tenant_memberships_tenant_pk";
  `);
}
