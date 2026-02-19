/**
 * Controlador de autenticación.
 *
 * Rutas:
 * - GET /auth/microsoft/login  → Inicia login con Microsoft
 * - GET /auth/microsoft/callback → Callback de Microsoft (redirige con token)
 * - GET /auth/callback         → Página de confirmación con token
 * - GET /auth/me               → Datos del usuario (requiere JWT)
 */
import {
  Controller,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { MicrosoftAuthGuard } from './guards/microsoft-auth.guard';
import type { Request as ExpressRequest, Response } from 'express';

import { AuthService } from './auth.service';
import { MicrosoftUser } from './interfaces/microsoft-user.interface';
import { ProfileWithAccessResponseDto } from './dto/profile-with-access.dto';

interface RequestWithMicrosoftUser extends ExpressRequest {
  user: MicrosoftUser;
}

import { JwtPayload } from './interfaces/jwt-payload.interface';

interface RequestWithJwtUser extends ExpressRequest {
  user: JwtPayload;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Inicia el flujo de login con Microsoft.
   * Redirige al usuario a la pantalla de login de Entra ID.
   */
  @UseGuards(MicrosoftAuthGuard)
  @Get('microsoft/login')
  async microsoftLogin() {
    // Passport redirige automáticamente a Microsoft, este handler no se ejecuta
  }

  /**
   * Callback donde Microsoft/Entra ID redirige después del login.
   * Debe coincidir con AZURE_REDIRECT_URI (ej: http://localhost:3000/auth/microsoft/callback)
   */
  @UseGuards(MicrosoftAuthGuard)
  @Get('microsoft/callback')
  async microsoftCallback(
    @Request() req: RequestWithMicrosoftUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.loginWithMicrosoft(req.user);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    // 🚀 Solo redirigir, SIN token en URL
    res.redirect(frontendUrl);
  }

  /**
   * Página de confirmación tras login exitoso.
   * Muestra el token para verificar que la autenticación funciona.
   */
  @Get('callback')
  authCallback(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      res.status(400).send(`
        <html><body style="font-family:sans-serif;padding:2rem;text-align:center">
          <h1>Error</h1>
          <p>No se recibió el token. ¿Completaste el login con Microsoft?</p>
          <a href="/auth/microsoft/login">Intentar de nuevo</a>
        </body></html>
      `);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Login exitoso</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 3rem auto; padding: 0 1.5rem; }
          h1 { color: #22c55e; }
          .token { background: #f1f5f9; padding: 1rem; border-radius: 8px; word-break: break-all; font-size: 0.85rem; }
          code { background: #e2e8f0; padding: 0.2em 0.4em; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Login exitoso</h1>
        <p>La autenticación con Microsoft funcionó correctamente.</p>
        <p>Tu token JWT:</p>
        <div class="token">${token}</div>
        <p style="margin-top: 1.5rem">Prueba el endpoint <code>GET /auth/me</code> con el header <code>Authorization: Bearer [tu-token]</code> para obtener los datos del usuario.</p>
      </body>
      </html>
    `;

    res.type('html').send(html);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(
    @Request() req: RequestWithJwtUser,
  ): Promise<ProfileWithAccessResponseDto> {
    return this.authService.getProfileWithAccess(req.user.id);
  }
}
