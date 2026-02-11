/**
 * Estrategia Passport para login con Microsoft Entra ID (OIDC).
 *
 * - Usa flujo authorization code (responseType: 'code')
 * - Guarda state/nonce en cookies (useCookieInsteadOfSession) para evitar express-session
 * - Requiere: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_REDIRECT_URI
 * - Opcional: COOKIE_ENCRYPTION_KEY (32 chars), COOKIE_ENCRYPTION_IV (12 chars)
 * - validate: extrae azureOid, email, name del perfil y los pasa a AuthService
 */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OIDCStrategy } from 'passport-azure-ad';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(
  OIDCStrategy as unknown as new (...args: any[]) => any,
  'microsoft',
  4, // Arity para (iss, sub, profile, done) - necesario para recibir el profile
) {
  constructor(configService: ConfigService) {
    const tenantId = configService.get<string>('AZURE_TENANT_ID');
    // Usar 'common' si no hay tenant o es inválido (permite cuentas Microsoft y de cualquier organización)
    const effectiveTenant =
      tenantId && tenantId !== 'your-tenant-id' && tenantId.length > 10
        ? tenantId
        : 'common';

    if (effectiveTenant === 'common' && tenantId !== 'common') {
      Logger.warn(
        'AZURE_TENANT_ID no configurado o inválido. Usando "common" (multi-tenant). ' +
          'Para un solo tenant, usa el Tenant ID (GUID) de Azure Portal > Entra ID > Información general.',
        MicrosoftStrategy.name,
      );
    }

    const identityMetadata = `https://login.microsoftonline.com/${effectiveTenant}/v2.0/.well-known/openid-configuration`;

    const cookieKey = configService.get<string>('COOKIE_ENCRYPTION_KEY');
    const cookieIv = configService.get<string>('COOKIE_ENCRYPTION_IV');
    const useCookie =
      cookieKey && cookieKey.length >= 32 && cookieIv && cookieIv.length >= 12;

    if (!useCookie) {
      Logger.warn(
        'COOKIE_ENCRYPTION_KEY (32 chars) y COOKIE_ENCRYPTION_IV (12 chars) deben estar configurados para OIDC sin sesiones. ' +
          'Añádelos a tu .env o el login fallará con error de sesión.',
        MicrosoftStrategy.name,
      );
    }

    super({
      identityMetadata,
      clientID: configService.get<string>('AZURE_CLIENT_ID')!,
      clientSecret: configService.get<string>('AZURE_CLIENT_SECRET')!,
      responseType: 'code',
      responseMode: 'query',
      redirectUrl: configService.get<string>('AZURE_REDIRECT_URI')!,
      allowHttpForRedirectUrl: true,
      scope: ['openid', 'profile', 'email'],
      validateIssuer: effectiveTenant !== 'common',
      // Usar cookies en lugar de sesiones (evita express-session)
      ...(useCookie && {
        useCookieInsteadOfSession: true,
        cookieEncryptionKeys: [
          {
            key: cookieKey!.slice(0, 32),
            iv: cookieIv!.slice(0, 12),
          },
        ],
        nonceLifetime: 600,
        nonceMaxAmount: 5,
      }),
    });
  }

  validate(
    _issuer: string,
    _sub: string,
    profile: {
      oid?: string;
      sub?: string;
      displayName?: string;
      _json?: { preferred_username?: string; name?: string };
    },
  ) {
    const oid = profile?.oid ?? profile?.sub;
    const email = profile?._json?.preferred_username ?? '';
    const name = profile?.displayName ?? profile?._json?.name ?? 'Usuario';

    if (!oid) {
      throw new Error(
        'No se pudo obtener el identificador del usuario de Microsoft',
      );
    }

    return {
      azureOid: oid,
      email,
      name,
    };
  }
}
