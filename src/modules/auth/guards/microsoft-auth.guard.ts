/**
 * Guard para rutas de Microsoft OIDC.
 *
 * Extiende AuthGuard('microsoft') y pasa el objeto Response a Passport.
 * Requerido cuando useCookieInsteadOfSession=true: passport-azure-ad
 * necesita res para escribir las cookies de state/nonce.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class MicrosoftAuthGuard extends AuthGuard('microsoft') {
  getAuthenticateOptions(context: ExecutionContext) {
    const response = context.switchToHttp().getResponse();
    return { response };
  }
}
