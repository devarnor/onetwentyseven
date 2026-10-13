export interface AuthPrincipal {
  entraTenantId: string;
  objectId: string;
  subject: string;
  clientId: string;
  scopes: string[];
  displayName?: string;
  username?: string;

  applicationTenantId?: string;
  userId?: string;
  membershipId?: string;
}
