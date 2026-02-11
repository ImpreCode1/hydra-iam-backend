/**
 * Módulo global de Prisma.
 *
 * Proporciona PrismaService a toda la aplicación para acceso a la base de datos.
 * Usa el cliente generado en src/generated/prisma con adaptador PostgreSQL.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
