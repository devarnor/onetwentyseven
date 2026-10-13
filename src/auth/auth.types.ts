export interface AuthPrincipal {
  tenantId: string;
  objectId: string;
  subject: string;
  clientId: string;
  scopes: string[];
  displayName?: string;
  username?: string;
}
