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
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MicrosoftUser } from '../auth/interfaces/microsoft-user.interface';
import { PositionsService } from '../positions/positions.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionsService: PositionsService,
  ) {}

  async findOrCreateFromMicrosoft(
    msUser: MicrosoftUser,
  ): Promise<UserWithRoles> {
    const positionId = await this.positionsService.findOrCreateByName(
      msUser.jobTitle,
    );

    let existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ azureOid: msUser.azureOid }, { email: msUser.email }],
      },
      include: {
        roles: { include: { role: true } },
        position: true,
      },
    });

    // =========================
    // USUARIO YA EXISTE
    // =========================
    if (existingUser) {
      if (!existingUser.isActive || existingUser.deletedAt) {
        throw new UnauthorizedException('Usuario desactivado');
      }

      const needsUpdate =
        existingUser.azureOid !== msUser.azureOid ||
        existingUser.positionId !== positionId ||
        existingUser.name !== msUser.name ||
        existingUser.email !== msUser.email;

      if (needsUpdate) {
        existingUser = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            azureOid: msUser.azureOid,
            positionId,
            name: msUser.name,
            email: msUser.email,
          },
          include: {
            roles: { include: { role: true } },
            position: true,
          },
        });
      }

      return existingUser as UserWithRoles;
    }

    // =========================
    // USUARIO NUEVO
    // =========================
    const newUser = await this.prisma.user.create({
      data: {
        name: msUser.name,
        email: msUser.email,
        azureOid: msUser.azureOid,
        positionId,
        isActive: true,
      },
    });

    // 🔥 Buscar rol USER
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (defaultRole) {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: newUser.id,
            roleId: defaultRole.id,
          },
        },
        update: {},
        create: {
          userId: newUser.id,
          roleId: defaultRole.id,
        },
      });
    }

    // 🔥 Retornar usuario con roles incluidos
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        roles: { include: { role: true } },
        position: true,
      },
    });

    return userWithRoles as UserWithRoles;
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        position: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        position: true,
        roles: { include: { role: true } },
      },
    });
  }

  async updateStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async resolveEffectiveRoles(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        position: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const directRoles = user.roles.map((r) => r.role.name);

    const positionRoles = user.position?.roles.map((r) => r.role.name) ?? [];

    return [...new Set([...directRoles, ...positionRoles])];
  }

  async assignRole(userId: string, roleId: string) {
    // Validar que usuario exista
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que rol exista
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    // Crear relación (evita duplicado por PK compuesta)
    try {
      return await this.prisma.userRole.create({
        data: { userId, roleId },
      });
    } catch {
      throw new BadRequestException('El usuario ya tiene este rol');
    }
  }

  async removeRole(userId: string, roleId: string) {
    return this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }
}
