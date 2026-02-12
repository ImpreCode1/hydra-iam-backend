/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * Estrategia Passport para login con Microsoft Entra ID (OIDC).
 *
 * - Usa authorization code flow
 * - Usa cookies en lugar de sesiones
 * - Obtiene jobTitle desde Microsoft Graph
 */

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OIDCStrategy } from 'passport-azure-ad';
import axios from 'axios';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(
  OIDCStrategy as unknown as new (...args: any[]) => any,
  'microsoft',
  6, // Arity para recibir accessToken
) {
  private readonly logger = new Logger(MicrosoftStrategy.name);

  constructor(configService: ConfigService) {
    const tenantId = configService.get<string>('AZURE_TENANT_ID');

    const effectiveTenant =
      tenantId && tenantId !== 'your-tenant-id' && tenantId.length > 10
        ? tenantId
        : 'common';

    if (effectiveTenant === 'common' && tenantId !== 'common') {
      Logger.warn(
        'AZURE_TENANT_ID no configurado o inválido. Usando "common".',
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
        'COOKIE_ENCRYPTION_KEY (32 chars) y COOKIE_ENCRYPTION_IV (12 chars) son requeridos.',
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

      // Scopes necesarios
      scope: ['openid', 'profile', 'email', 'User.Read'],

      validateIssuer: effectiveTenant !== 'common',

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

  /**
   * validate se ejecuta después del login exitoso.
   * Aquí podemos usar accessToken para consultar Microsoft Graph.
   */
  async validate(
    _issuer: string,
    _sub: string,
    profile: any,
    accessToken: string,
  ) {
    const oid = profile?.oid ?? profile?.sub;
    const email = profile?._json?.preferred_username ?? '';
    const name = profile?.displayName ?? profile?._json?.name ?? 'Usuario';

    if (!oid) {
      throw new Error(
        'No se pudo obtener el identificador del usuario de Microsoft',
      );
    }

    let jobTitle: string | null = null;

    try {
      const graphResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const raw = graphResponse.data?.jobTitle;
      jobTitle = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
    } catch (error) {
      this.logger.warn('No se pudo obtener jobTitle desde Microsoft Graph');
    }

    this.logger.log(
      `Usuario autenticado: ${email} | Cargo detectado: ${jobTitle ?? 'N/A'}`,
    );

    return {
      microsoftId: oid,
      azureOid: oid,
      email,
      name,
      jobTitle,
    };
  }
}
