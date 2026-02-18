/**
 * Módulo de autenticación.
 *
 * Incluye:
 * - Login con Microsoft Entra ID (OIDC)
 * - JWT para proteger rutas (AuthGuard 'jwt')
 *
 * Rutas: /auth/microsoft/login, /auth/microsoft/callback, /auth/callback, /auth/me
 */
/* eslint-disable @typescript-eslint/require-await */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MicrosoftAuthGuard } from './guards/microsoft-auth.guard';

import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './guards/JwtAuthGuard.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ??
          'fallback-secret-change-in-prod',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MicrosoftStrategy,
    JwtStrategy,
    MicrosoftAuthGuard,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
