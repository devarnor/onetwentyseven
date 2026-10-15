import type {
  MigrationBuilder,
  ColumnDefinitions,
} from 'node-pg-migrate';

export const shorthands:
  | ColumnDefinitions
  | undefined = undefined;

export async function up(
  pgm: MigrationBuilder,
): Promise<void> {
  pgm.addColumn(
    'tenant_memberships',
    {
      version: {
        type: 'integer',
        notNull: true,
        default: 1,
      },
    },
  );

  pgm.sql(`
    CREATE UNIQUE INDEX
      uq_users_email_lower
    ON users (LOWER(email));
  `);
}

export async function down(
  pgm: MigrationBuilder,
): Promise<void> {
  pgm.sql(`
    DROP INDEX IF EXISTS
      uq_users_email_lower;
  `);

  pgm.dropColumn(
    'tenant_memberships',
    'version',
  );
}
