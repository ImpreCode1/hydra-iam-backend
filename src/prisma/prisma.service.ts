/**
 * Servicio de base de datos con Prisma.
 * Extiende PrismaClient con adaptador pg para PostgreSQL.
 * Verifica conexión al iniciar (SELECT 1).
 * @requires DATABASE_URL
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$queryRaw`SELECT 1`;
      Logger.log('Conexión establecida con la base de datos');
    } catch (error) {
      Logger.log('Conexión fallida con la base de datos');
    }
  }
}
