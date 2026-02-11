/**
 * Servicio de usuarios.
 *
 * findOrCreateFromMicrosoft:
 * - Busca usuario por azureOid o email
 * - Si existe sin azureOid, actualiza con azureOid
 * - Si no existe, crea usuario SSO (sin password/position)
 * - Incluye roles con { role: { name } } y position
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MicrosoftUser } from '../auth/interfaces/microsoft-user.interface';

/** Usuario con roles incluidos para auth */
export interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  password?: string | null;
  azureOid?: string | null;
  roles: { role: { name: string } }[];
  [key: string]: unknown;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateFromMicrosoft(
    msUser: MicrosoftUser,
  ): Promise<UserWithRoles> {
    // Buscar por azureOid o por email (usuario existente que inicia sesión con Microsoft)
    let existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ azureOid: msUser.azureOid }, { email: msUser.email }],
      },
      include: {
        roles: { include: { role: true } },
        position: true,
      },
    });

    if (existingUser) {
      // Si existe por email pero no tiene azureOid, actualizarlo
      if (!existingUser.azureOid) {
        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { azureOid: msUser.azureOid },
          include: {
            roles: { include: { role: true } },
            position: true,
          },
        });
      }
      return existingUser as UserWithRoles;
    }

    const newUser = await this.prisma.user.create({
      data: {
        name: msUser.name,
        email: msUser.email,
        azureOid: msUser.azureOid,
        isActive: true,
        // password y positionId opcionales para usuarios SSO
      },
      include: {
        roles: { include: { role: true } },
        position: true,
      },
    });

    return newUser as UserWithRoles;
  }
}
