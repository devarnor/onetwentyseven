import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthPrincipal } from './auth.types';

type AuthenticatedRequest = {
  user?: AuthPrincipal;
};

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthPrincipal => {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException(
        'Authenticated user context is unavailable.',
      );
    }

    return request.user;
  },
);
