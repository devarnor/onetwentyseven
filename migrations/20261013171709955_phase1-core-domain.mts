import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {

  // ===========================================================================
  // ACCOUNTS
  // Growth/CRM customer, prospect, partner, vendor, or other business account.
  // ===========================================================================
  pgm.createTable('accounts', {
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
    owner_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },

    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    legal_name: {
      type: 'varchar(255)',
    },
    account_type: {
      type: 'varchar(100)',
      notNull: true,
      default: 'prospect',
    },
    industry: {
      type: 'varchar(150)',
    },
    website: {
      type: 'varchar(500)',
    },
    phone: {
      type: 'varchar(50)',
    },

    billing_address_line1: {
      type: 'varchar(255)',
    },
    billing_address_line2: {
      type: 'varchar(255)',
    },
    billing_city: {
      type: 'varchar(150)',
    },
    billing_state_region: {
      type: 'varchar(150)',
    },
    billing_postal_code: {
      type: 'varchar(30)',
    },
    billing_country_code: {
      type: 'varchar(2)',
    },

    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    source: {
      type: 'varchar(150)',
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

    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    updated_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
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

  pgm.createIndex('accounts', ['tenant_id']);
  pgm.createIndex('accounts', ['tenant_id', 'name']);
  pgm.createIndex('accounts', ['organization_id']);
  pgm.createIndex('accounts', ['owner_user_id']);
  pgm.createIndex('accounts', ['created_by_user_id']);
  pgm.createIndex('accounts', ['updated_by_user_id']);

  // ===========================================================================
  // CONTACTS
  // Individual people associated with Growth accounts.
  // ===========================================================================
  pgm.createTable('contacts', {
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
    account_id: {
      type: 'uuid',
      references: 'accounts',
      onDelete: 'SET NULL',
    },
    owner_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },

    first_name: {
      type: 'varchar(150)',
      notNull: true,
    },
    last_name: {
      type: 'varchar(150)',
      notNull: true,
    },
    job_title: {
      type: 'varchar(255)',
    },
    department: {
      type: 'varchar(255)',
    },
    email: {
      type: 'varchar(320)',
    },
    phone: {
      type: 'varchar(50)',
    },
    mobile_phone: {
      type: 'varchar(50)',
    },

    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    source: {
      type: 'varchar(150)',
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

    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    updated_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
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

  pgm.createIndex('contacts', ['tenant_id']);
  pgm.createIndex('contacts', ['account_id']);
  pgm.createIndex('contacts', ['owner_user_id']);
  pgm.createIndex('contacts', ['tenant_id', 'email']);
  pgm.createIndex('contacts', ['created_by_user_id']);
  pgm.createIndex('contacts', ['updated_by_user_id']);

  // ===========================================================================
  // OPPORTUNITIES
  // Growth pipeline record leading toward Develop / ESIT / Indicative.
  // ===========================================================================
  pgm.createTable('opportunities', {
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
    account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
      onDelete: 'RESTRICT',
    },
    primary_contact_id: {
      type: 'uuid',
      references: 'contacts',
      onDelete: 'SET NULL',
    },
    facility_id: {
      type: 'uuid',
      references: 'facilities',
      onDelete: 'SET NULL',
    },
    owner_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },

    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    opportunity_number: {
      type: 'varchar(100)',
    },
    stage: {
      type: 'varchar(100)',
      notNull: true,
      default: 'lead',
    },
    opportunity_type: {
      type: 'varchar(100)',
    },

    estimated_value: {
      type: 'numeric(18,2)',
    },
    probability_percent: {
      type: 'numeric(5,2)',
    },
    expected_close_date: {
      type: 'date',
    },
    actual_close_date: {
      type: 'date',
    },

    description: {
      type: 'text',
    },
    loss_reason: {
      type: 'text',
    },

    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'open',
    },
    source: {
      type: 'varchar(150)',
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

    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    updated_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
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
    'opportunities',
    'uq_opportunities_tenant_number',
    {
      unique: ['tenant_id', 'opportunity_number'],
    },
  );

  pgm.createIndex('opportunities', ['tenant_id']);
  pgm.createIndex('opportunities', ['account_id']);
  pgm.createIndex('opportunities', ['primary_contact_id']);
  pgm.createIndex('opportunities', ['facility_id']);
  pgm.createIndex('opportunities', ['owner_user_id']);
  pgm.createIndex('opportunities', ['tenant_id', 'stage']);
  pgm.createIndex('opportunities', ['tenant_id', 'status']);
  pgm.createIndex('opportunities', ['expected_close_date']);
  pgm.createIndex('opportunities', ['created_by_user_id']);
  pgm.createIndex('opportunities', ['updated_by_user_id']);

  // ===========================================================================
  // PROJECTS
  // Project record that continues the lifecycle beyond Growth.
  // ===========================================================================
  pgm.createTable('projects', {
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
    account_id: {
      type: 'uuid',
      references: 'accounts',
      onDelete: 'SET NULL',
    },
    opportunity_id: {
      type: 'uuid',
      references: 'opportunities',
      onDelete: 'SET NULL',
    },
    facility_id: {
      type: 'uuid',
      references: 'facilities',
      onDelete: 'SET NULL',
    },
    owner_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },

    project_number: {
      type: 'varchar(100)',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    project_type: {
      type: 'varchar(100)',
    },
    lifecycle_stage: {
      type: 'varchar(100)',
      notNull: true,
      default: 'develop',
    },

    description: {
      type: 'text',
    },
    estimated_value: {
      type: 'numeric(18,2)',
    },

    planned_start_date: {
      type: 'date',
    },
    planned_end_date: {
      type: 'date',
    },
    actual_start_date: {
      type: 'date',
    },
    actual_end_date: {
      type: 'date',
    },

    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    source: {
      type: 'varchar(150)',
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

    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    updated_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
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
    'projects',
    'uq_projects_tenant_number',
    {
      unique: ['tenant_id', 'project_number'],
    },
  );

  pgm.createIndex('projects', ['tenant_id']);
  pgm.createIndex('projects', ['account_id']);
  pgm.createIndex('projects', ['opportunity_id']);
  pgm.createIndex('projects', ['facility_id']);
  pgm.createIndex('projects', ['owner_user_id']);
  pgm.createIndex('projects', ['tenant_id', 'lifecycle_stage']);
  pgm.createIndex('projects', ['tenant_id', 'status']);
  pgm.createIndex('projects', ['created_by_user_id']);
  pgm.createIndex('projects', ['updated_by_user_id']);

  // ===========================================================================
  // ACTIVITIES / COMMUNICATIONS
  // Calls, emails, meetings, tasks, notes, and other CRM interactions.
  // ===========================================================================
  pgm.createTable('activities', {
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

    account_id: {
      type: 'uuid',
      references: 'accounts',
      onDelete: 'SET NULL',
    },
    contact_id: {
      type: 'uuid',
      references: 'contacts',
      onDelete: 'SET NULL',
    },
    opportunity_id: {
      type: 'uuid',
      references: 'opportunities',
      onDelete: 'SET NULL',
    },
    project_id: {
      type: 'uuid',
      references: 'projects',
      onDelete: 'SET NULL',
    },

    owner_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    assigned_to_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },

    activity_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    direction: {
      type: 'varchar(50)',
    },
    subject: {
      type: 'varchar(500)',
    },
    body: {
      type: 'text',
    },

    occurred_at: {
      type: 'timestamptz',
    },
    due_at: {
      type: 'timestamptz',
    },
    completed_at: {
      type: 'timestamptz',
    },

    external_message_id: {
      type: 'varchar(500)',
    },
    external_thread_id: {
      type: 'varchar(500)',
    },

    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'open',
    },
    source: {
      type: 'varchar(150)',
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

    created_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
    },
    updated_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
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

  pgm.createIndex('activities', ['tenant_id']);
  pgm.createIndex('activities', ['account_id']);
  pgm.createIndex('activities', ['contact_id']);
  pgm.createIndex('activities', ['opportunity_id']);
  pgm.createIndex('activities', ['project_id']);
  pgm.createIndex('activities', ['owner_user_id']);
  pgm.createIndex('activities', ['assigned_to_user_id']);
  pgm.createIndex('activities', ['tenant_id', 'activity_type']);
  pgm.createIndex('activities', ['tenant_id', 'status']);
  pgm.createIndex('activities', ['occurred_at']);
  pgm.createIndex('activities', ['due_at']);
  pgm.createIndex('activities', ['created_by_user_id']);
  pgm.createIndex('activities', ['updated_by_user_id']);

  // ===========================================================================
  // ACTIVITY CONTACTS
  // Allows meetings/emails/etc. to involve multiple contacts.
  // ===========================================================================
  pgm.createTable('activity_contacts', {
    activity_id: {
      type: 'uuid',
      notNull: true,
      references: 'activities',
      onDelete: 'CASCADE',
    },
    contact_id: {
      type: 'uuid',
      notNull: true,
      references: 'contacts',
      onDelete: 'CASCADE',
    },
    participant_role: {
      type: 'varchar(100)',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint(
    'activity_contacts',
    'pk_activity_contacts',
    {
      primaryKey: ['activity_id', 'contact_id'],
    },
  );

  pgm.createIndex('activity_contacts', ['contact_id']);

  // ===========================================================================
  // DOCUMENTS
  // Vault metadata only. Binary content stays in Azure Blob Storage.
  // ===========================================================================
  pgm.createTable('documents', {
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
      type: 'varchar(500)',
      notNull: true,
    },
    original_filename: {
      type: 'varchar(500)',
      notNull: true,
    },
    document_type: {
      type: 'varchar(150)',
    },
    content_type: {
      type: 'varchar(255)',
    },
    size_bytes: {
      type: 'bigint',
    },

    storage_account: {
      type: 'varchar(255)',
      notNull: true,
    },
    storage_container: {
      type: 'varchar(255)',
      notNull: true,
    },
    blob_name: {
      type: 'text',
      notNull: true,
    },

    sha256_hash: {
      type: 'varchar(64)',
    },

    document_version: {
      type: 'integer',
      notNull: true,
      default: 1,
    },
    is_current_version: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    prior_document_id: {
      type: 'uuid',
      references: 'documents',
      onDelete: 'SET NULL',
    },

    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'active',
    },
    source: {
      type: 'varchar(150)',
    },
    external_id: {
      type: 'varchar(255)',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },

    uploaded_by_user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'SET NULL',
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
    'documents',
    'uq_documents_storage_blob',
    {
      unique: [
        'tenant_id',
        'storage_account',
        'storage_container',
        'blob_name',
      ],
    },
  );

  pgm.createIndex('documents', ['tenant_id']);
  pgm.createIndex('documents', ['tenant_id', 'document_type']);
  pgm.createIndex('documents', ['prior_document_id']);
  pgm.createIndex('documents', ['uploaded_by_user_id']);
  pgm.createIndex('documents', ['sha256_hash']);

  // ===========================================================================
  // DOCUMENT LINKS
  // Generic lifecycle association so Vault documents can attach to current
  // and future 127 entities without redesigning the documents table.
  // Examples: account, opportunity, project, ESIT, workbook, capital record.
  // ===========================================================================
  pgm.createTable('document_links', {
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
    document_id: {
      type: 'uuid',
      notNull: true,
      references: 'documents',
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
    link_type: {
      type: 'varchar(100)',
      notNull: true,
      default: 'attachment',
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

  pgm.addConstraint(
    'document_links',
    'uq_document_links_document_entity',
    {
      unique: [
        'document_id',
        'entity_type',
        'entity_id',
        'link_type',
      ],
    },
  );

  pgm.createIndex('document_links', ['tenant_id']);
  pgm.createIndex('document_links', ['document_id']);
  pgm.createIndex('document_links', ['entity_type', 'entity_id']);
  pgm.createIndex('document_links', ['created_by_user_id']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('document_links');
  pgm.dropTable('documents');
  pgm.dropTable('activity_contacts');
  pgm.dropTable('activities');
  pgm.dropTable('projects');
  pgm.dropTable('opportunities');
  pgm.dropTable('contacts');
  pgm.dropTable('accounts');
}
