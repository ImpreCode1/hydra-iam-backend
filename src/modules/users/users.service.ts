/**
 * Servicio de usuarios.
 *
 * findOrCreateFromMicrosoft:
 * - Busca usuario por azureOid o email
 * - Si existe sin azureOid, actualiza con azureOid
 * - Si no existe, crea usuario SSO (sin password)
 * - Sincroniza cargo desde Azure AD (jobTitle)
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
  positionId?: string | null;
  position?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  roles: { role: { name: string } }[];
  isActive?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca o crea cargo basado en el jobTitle de Azure AD
   * Si el cargo no existe, lo crea automáticamente
   */
  private async findOrCreatePosition(
    jobTitle: string | null | undefined,
  ): Promise<string | null> {
    if (!jobTitle) return null;

    // Normalizar el nombre del cargo
    const normalizedJobTitle = jobTitle.trim();

    // Buscar cargo existente
    let position = await this.prisma.position.findFirst({
      where: {
        name: normalizedJobTitle,
        deletedAt: null,
      },
    });

    // Si no existe, crearlo
    if (!position) {
      position = await this.prisma.position.create({
        data: {
          name: normalizedJobTitle,
          description: `Cargo sincronizado desde Azure AD`,
        },
      });
    }

    return position.id;
  }

  async findOrCreateFromMicrosoft(
    msUser: MicrosoftUser,
  ): Promise<UserWithRoles> {
    // Buscar o crear el cargo basado en jobTitle de Azure
    const positionId = await this.findOrCreatePosition(msUser.jobTitle);

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
      // Actualizar azureOid y cargo si es necesario
      const needsUpdate =
        !existingUser.azureOid || existingUser.positionId !== positionId;

      if (needsUpdate) {
        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            azureOid: msUser.azureOid,
            positionId: positionId,
            name: msUser.name, // Actualizar nombre también por si cambió en Azure
          },
          include: {
            roles: { include: { role: true } },
            position: true,
          },
        });
      }
      return existingUser as UserWithRoles;
    }

    // Crear nuevo usuario con cargo
    const newUser = await this.prisma.user.create({
      data: {
        name: msUser.name,
        email: msUser.email,
        azureOid: msUser.azureOid,
        positionId: positionId,
        isActive: true,
      },
      include: {
        roles: { include: { role: true } },
        position: true,
      },
    });

    return newUser as UserWithRoles;
  }
}
