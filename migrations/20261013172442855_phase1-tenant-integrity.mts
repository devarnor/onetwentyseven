import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {

  // ===========================================================================
  // COMPOSITE UNIQUE KEYS
  //
  // These allow tenant-aware foreign keys such as:
  //   (tenant_id, account_id) -> accounts (tenant_id, id)
  //
  // The normal UUID primary keys remain unchanged.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "organizations"
      ADD CONSTRAINT "uq_organizations_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "facilities"
      ADD CONSTRAINT "uq_facilities_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "accounts"
      ADD CONSTRAINT "uq_accounts_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "contacts"
      ADD CONSTRAINT "uq_contacts_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "opportunities"
      ADD CONSTRAINT "uq_opportunities_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "projects"
      ADD CONSTRAINT "uq_projects_tenant_pk"
      UNIQUE ("tenant_id", "id");

    ALTER TABLE "documents"
      ADD CONSTRAINT "uq_documents_tenant_pk"
      UNIQUE ("tenant_id", "id");
  `);

  // ===========================================================================
  // FOUNDATION RELATIONSHIPS
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "organizations"
      ADD CONSTRAINT "fk_org_parent_same_tenant"
      FOREIGN KEY ("tenant_id", "parent_organization_id")
      REFERENCES "organizations" ("tenant_id", "id")
      ON DELETE SET NULL ("parent_organization_id");

    ALTER TABLE "tenant_memberships"
      ADD CONSTRAINT "fk_membership_org_same_tenant"
      FOREIGN KEY ("tenant_id", "primary_organization_id")
      REFERENCES "organizations" ("tenant_id", "id")
      ON DELETE SET NULL ("primary_organization_id");

    ALTER TABLE "facilities"
      ADD CONSTRAINT "fk_facility_org_same_tenant"
      FOREIGN KEY ("tenant_id", "organization_id")
      REFERENCES "organizations" ("tenant_id", "id")
      ON DELETE SET NULL ("organization_id");
  `);

  // ===========================================================================
  // ACCOUNTS
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "accounts"
      ADD CONSTRAINT "fk_account_org_same_tenant"
      FOREIGN KEY ("tenant_id", "organization_id")
      REFERENCES "organizations" ("tenant_id", "id")
      ON DELETE SET NULL ("organization_id");
  `);

  // ===========================================================================
  // CONTACTS
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "contacts"
      ADD CONSTRAINT "fk_contact_account_same_tenant"
      FOREIGN KEY ("tenant_id", "account_id")
      REFERENCES "accounts" ("tenant_id", "id")
      ON DELETE SET NULL ("account_id");
  `);

  // ===========================================================================
  // OPPORTUNITIES
  // account_id is required, so a referenced account cannot be deleted while
  // an opportunity still depends on it.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "opportunities"
      ADD CONSTRAINT "fk_opp_account_same_tenant"
      FOREIGN KEY ("tenant_id", "account_id")
      REFERENCES "accounts" ("tenant_id", "id")
      ON DELETE RESTRICT;

    ALTER TABLE "opportunities"
      ADD CONSTRAINT "fk_opp_contact_same_tenant"
      FOREIGN KEY ("tenant_id", "primary_contact_id")
      REFERENCES "contacts" ("tenant_id", "id")
      ON DELETE SET NULL ("primary_contact_id");

    ALTER TABLE "opportunities"
      ADD CONSTRAINT "fk_opp_facility_same_tenant"
      FOREIGN KEY ("tenant_id", "facility_id")
      REFERENCES "facilities" ("tenant_id", "id")
      ON DELETE SET NULL ("facility_id");
  `);

  // ===========================================================================
  // PROJECTS
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "projects"
      ADD CONSTRAINT "fk_project_account_same_tenant"
      FOREIGN KEY ("tenant_id", "account_id")
      REFERENCES "accounts" ("tenant_id", "id")
      ON DELETE SET NULL ("account_id");

    ALTER TABLE "projects"
      ADD CONSTRAINT "fk_project_opp_same_tenant"
      FOREIGN KEY ("tenant_id", "opportunity_id")
      REFERENCES "opportunities" ("tenant_id", "id")
      ON DELETE SET NULL ("opportunity_id");

    ALTER TABLE "projects"
      ADD CONSTRAINT "fk_project_facility_same_tenant"
      FOREIGN KEY ("tenant_id", "facility_id")
      REFERENCES "facilities" ("tenant_id", "id")
      ON DELETE SET NULL ("facility_id");
  `);

  // ===========================================================================
  // ACTIVITIES / COMMUNICATIONS
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "activities"
      ADD CONSTRAINT "fk_activity_account_same_tenant"
      FOREIGN KEY ("tenant_id", "account_id")
      REFERENCES "accounts" ("tenant_id", "id")
      ON DELETE SET NULL ("account_id");

    ALTER TABLE "activities"
      ADD CONSTRAINT "fk_activity_contact_same_tenant"
      FOREIGN KEY ("tenant_id", "contact_id")
      REFERENCES "contacts" ("tenant_id", "id")
      ON DELETE SET NULL ("contact_id");

    ALTER TABLE "activities"
      ADD CONSTRAINT "fk_activity_opp_same_tenant"
      FOREIGN KEY ("tenant_id", "opportunity_id")
      REFERENCES "opportunities" ("tenant_id", "id")
      ON DELETE SET NULL ("opportunity_id");

    ALTER TABLE "activities"
      ADD CONSTRAINT "fk_activity_project_same_tenant"
      FOREIGN KEY ("tenant_id", "project_id")
      REFERENCES "projects" ("tenant_id", "id")
      ON DELETE SET NULL ("project_id");
  `);

  // ===========================================================================
  // DOCUMENTS / VAULT
  // Document versions must remain inside the same tenant.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "documents"
      ADD CONSTRAINT "fk_document_prior_same_tenant"
      FOREIGN KEY ("tenant_id", "prior_document_id")
      REFERENCES "documents" ("tenant_id", "id")
      ON DELETE SET NULL ("prior_document_id");
  `);

  // ===========================================================================
  // DOCUMENT LINKS
  //
  // This guarantees the linked document belongs to the same tenant.
  // entity_type/entity_id remains polymorphic by design, so that side is
  // enforced by the application/domain layer rather than a conventional FK.
  // ===========================================================================

  pgm.sql(`
    ALTER TABLE "document_links"
      ADD CONSTRAINT "fk_document_link_document_same_tenant"
      FOREIGN KEY ("tenant_id", "document_id")
      REFERENCES "documents" ("tenant_id", "id")
      ON DELETE CASCADE;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {

  // Remove tenant-aware foreign keys first.
  pgm.sql(`
    ALTER TABLE "document_links"
      DROP CONSTRAINT IF EXISTS "fk_document_link_document_same_tenant";

    ALTER TABLE "documents"
      DROP CONSTRAINT IF EXISTS "fk_document_prior_same_tenant";

    ALTER TABLE "activities"
      DROP CONSTRAINT IF EXISTS "fk_activity_project_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_activity_opp_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_activity_contact_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_activity_account_same_tenant";

    ALTER TABLE "projects"
      DROP CONSTRAINT IF EXISTS "fk_project_facility_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_project_opp_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_project_account_same_tenant";

    ALTER TABLE "opportunities"
      DROP CONSTRAINT IF EXISTS "fk_opp_facility_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_opp_contact_same_tenant",
      DROP CONSTRAINT IF EXISTS "fk_opp_account_same_tenant";

    ALTER TABLE "contacts"
      DROP CONSTRAINT IF EXISTS "fk_contact_account_same_tenant";

    ALTER TABLE "accounts"
      DROP CONSTRAINT IF EXISTS "fk_account_org_same_tenant";

    ALTER TABLE "facilities"
      DROP CONSTRAINT IF EXISTS "fk_facility_org_same_tenant";

    ALTER TABLE "tenant_memberships"
      DROP CONSTRAINT IF EXISTS "fk_membership_org_same_tenant";

    ALTER TABLE "organizations"
      DROP CONSTRAINT IF EXISTS "fk_org_parent_same_tenant";
  `);

  // Remove the composite unique keys last.
  pgm.sql(`
    ALTER TABLE "documents"
      DROP CONSTRAINT IF EXISTS "uq_documents_tenant_pk";

    ALTER TABLE "projects"
      DROP CONSTRAINT IF EXISTS "uq_projects_tenant_pk";

    ALTER TABLE "opportunities"
      DROP CONSTRAINT IF EXISTS "uq_opportunities_tenant_pk";

    ALTER TABLE "contacts"
      DROP CONSTRAINT IF EXISTS "uq_contacts_tenant_pk";

    ALTER TABLE "accounts"
      DROP CONSTRAINT IF EXISTS "uq_accounts_tenant_pk";

    ALTER TABLE "facilities"
      DROP CONSTRAINT IF EXISTS "uq_facilities_tenant_pk";

    ALTER TABLE "organizations"
      DROP CONSTRAINT IF EXISTS "uq_organizations_tenant_pk";
  `);
}
