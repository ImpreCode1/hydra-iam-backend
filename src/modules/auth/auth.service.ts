/**
 * Servicio de autenticación.
 * loginWithMicrosoft: busca/crea usuario, genera JWT con roles y cargo, devuelve token + user (sin password).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MicrosoftUser } from './interfaces/microsoft-user.interface';

import { ProfileWithAccessResponseDto } from './dto/profile-with-access.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async loginWithMicrosoft(msUser: MicrosoftUser) {
    const user = await this.usersService.findOrCreateFromMicrosoft(msUser);

    const roleNames: string[] =
      user.roles?.flatMap((ur) => (ur.role?.name ? [ur.role.name] : [])) ?? [];

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: roleNames,
      positionId: user.positionId ?? null,
    };

    const { password, ...userWithoutPassword } = user;

    // evitar warning unused variable
    void password;

    const accessToken = this.jwtService.sign(payload, {
      issuer: 'hydra-iam',
      audience: 'internal-platforms',
    });

    return {
      accessToken,
      user: userWithoutPassword,
    };
  }

  async getProfileWithAccess(
    userId: string,
  ): Promise<ProfileWithAccessResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        position: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const rolesFromPosition = user.position?.roles.map((pr) => pr.role) ?? [];

    const directRoles = user.roles.map((ur) => ur.role);

    const roleMap = new Map<string, (typeof rolesFromPosition)[number]>();

    for (const role of rolesFromPosition) {
      roleMap.set(role.id, role);
    }

    for (const role of directRoles) {
      roleMap.set(role.id, role);
    }

    const effectiveRoles = Array.from(roleMap.values());

    const platforms = await this.prisma.platform.findMany({
      where: {
        roles: {
          some: {
            roleId: {
              in: effectiveRoles.map((role) => role.id),
            },
          },
        },
        isActive: true,
        deletedAt: null,
      },
      select: {
        name: true,
        code: true,
        url: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      position: user.position ? user.position.name : null,
      roles: effectiveRoles.map((role) => role.name),
      platforms,
    };
  }
}
