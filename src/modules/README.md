# Módulos - Hydra IAM

## Auth (`auth/`)

Autenticación con Microsoft Entra ID (SSO) y JWT.

| Archivo | Descripción |
|---------|-------------|
| `auth.controller.ts` | Rutas: `/auth/microsoft/login`, `/auth/microsoft/callback`, `/auth/callback`, `/auth/me` |
| `auth.service.ts` | Lógica de login: busca/crea usuario, genera JWT |
| `auth.module.ts` | Configura Passport, JWT, estrategias y guards |
| `strategies/jwt.strategy.ts` | Valida JWT del header `Authorization: Bearer` |
| `strategies/microsoft.strategy.ts` | OIDC con Microsoft Entra ID (cookies para state/nonce) |
| `guards/microsoft-auth.guard.ts` | Pasa `Response` a Passport para cookies |
| `interfaces/microsoft-user.interface.ts` | Tipo: azureOid, email, name |

## Users (`users/`)

Gestión de usuarios.

| Archivo | Descripción |
|---------|-------------|
| `users.service.ts` | `findOrCreateFromMicrosoft`: busca por azureOid/email, crea si no existe |
| `users.module.ts` | Exporta UsersService para AuthModule |
