import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthPrincipal } from './auth.types';

type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthPrincipal;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Authorization header is required.',
      );
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match?.[1]) {
      throw new UnauthorizedException(
        'Authorization header must use Bearer authentication.',
      );
    }

    const principal = await this.authService.validateAccessToken(
      match[1].trim(),
    );

    request.user = principal;

    return true;
  }
}
