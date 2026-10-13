import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import type { AuthPrincipal } from './auth.types';

@Injectable()
export class AuthService {
  private readonly tenantId: string;
  private readonly apiClientId: string;
  private readonly webClientId: string;
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly configService: ConfigService) {
    this.tenantId = this.requireConfig('ENTRA_TENANT_ID');
    this.apiClientId = this.requireConfig('ENTRA_API_CLIENT_ID');
    this.webClientId = this.requireConfig('ENTRA_WEB_CLIENT_ID');

    this.issuer =
      `https://login.microsoftonline.com/${this.tenantId}/v2.0`;

    this.jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
      ),
    );
  }

  async validateAccessToken(token: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.apiClientId,
      });

      this.validateTenant(payload);
      this.validateCallingClient(payload);

      const scopes = this.getScopes(payload);

      if (!scopes.includes('access_as_user')) {
        throw new UnauthorizedException(
          'Access token does not contain the required access_as_user scope.',
        );
      }

      const objectId = this.requireClaim(payload, 'oid');
      const subject = this.requireClaim(payload, 'sub');

      return {
        tenantId: this.tenantId,
        objectId,
        subject,
        clientId: this.webClientId,
        scopes,
        displayName:
          typeof payload.name === 'string'
            ? payload.name
            : undefined,
        username:
          typeof payload.preferred_username === 'string'
            ? payload.preferred_username
            : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        'Invalid or expired access token.',
      );
    }
  }

  private validateTenant(payload: JWTPayload): void {
    if (payload.tid !== this.tenantId) {
      throw new UnauthorizedException(
        'Access token tenant is not authorized.',
      );
    }
  }

  private validateCallingClient(payload: JWTPayload): void {
    if (payload.azp !== this.webClientId) {
      throw new UnauthorizedException(
        'Access token was not issued to an authorized OneTwentySeven client.',
      );
    }
  }

  private getScopes(payload: JWTPayload): string[] {
    if (typeof payload.scp !== 'string') {
      return [];
    }

    return payload.scp
      .split(' ')
      .map((scope) => scope.trim())
      .filter(Boolean);
  }

  private requireClaim(
    payload: JWTPayload,
    claim: string,
  ): string {
    const value = payload[claim];

    if (typeof value !== 'string' || !value) {
      throw new UnauthorizedException(
        `Access token is missing required ${claim} claim.`,
      );
    }

    return value;
  }

  private requireConfig(name: string): string {
    const value = this.configService.get<string>(name);

    if (!value) {
      throw new Error(
        `${name} configuration is required.`,
      );
    }

    return value;
  }
}
