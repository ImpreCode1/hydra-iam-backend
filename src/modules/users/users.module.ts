/**
 * Módulo de usuarios.
 *
 * Proporciona UsersService para gestión de usuarios.
 * Usado por AuthModule (findOrCreateFromMicrosoft).
 * PrismaService disponible vía PrismaModule global.
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService], // IMPORTANTE
})
export class UsersModule {}
