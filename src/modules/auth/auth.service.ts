/**
 * Servicio de autenticación.
 * loginWithMicrosoft: busca/crea usuario, genera JWT con roles y cargo, devuelve token + user (sin password).
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { MicrosoftUser } from './interfaces/microsoft-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithMicrosoft(msUser: MicrosoftUser) {
    const user = await this.usersService.findOrCreateFromMicrosoft(msUser);

    const roleNames =
      user.roles?.map((ur) => ur.role?.name).filter(Boolean) ?? [];

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: roleNames,
      positionId: user.positionId ?? null,
      position: user.position
        ? {
            id: user.position.id,
            name: user.position.name,
            description: user.position.description ?? null,
          }
        : null,
    };

    // Excluir password del objeto user en la respuesta
    const { password: _pass, ...userWithoutPassword } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }
}
