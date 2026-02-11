/**
 * Estrategia Passport para validar JWT.
 *
 * - Lee el token del header Authorization: Bearer <token>
 * - Valida con JWT_SECRET
 * - El payload debe tener: sub, email, name?, roles?
 * - Devuelve { id, email, name, roles } para req.user
 */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ??
        'fallback-secret-change-in-prod',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    name?: string;
    roles?: string[];
  }) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles ?? [],
    };
  }
}
