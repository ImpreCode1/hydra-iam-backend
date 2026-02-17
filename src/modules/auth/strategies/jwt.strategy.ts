/**
 * Estrategia Passport para validar JWT.
 *
 * - Lee el token del header Authorization: Bearer <token>
 * - O desde cookie access_token
 * - Valida con JWT_SECRET
 * - El payload debe tener: sub, email, name?, roles?, positionId?, position?
 * - Devuelve { id, email, name, roles, positionId, position } para req.user
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  roles?: string[];
  positionId?: string | null;
  position?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          if (!req) return null;

          const tokenFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

          const tokenFromCookie =
            (req.cookies as Record<string, string> | undefined)?.access_token ??
            null;

          return tokenFromHeader ?? tokenFromCookie;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles ?? [],
      positionId: payload.positionId ?? null,
      position: payload.position ?? null,
    };
  }
}
