/**
 * Datos del usuario devueltos por Microsoft Entra ID tras el login OIDC.
 * Usado por AuthService.loginWithMicrosoft y UsersService.findOrCreateFromMicrosoft.
 * jobTitle se usa para sincronizar el cargo (Position) del usuario en la BD.
 */
export interface MicrosoftUser {
  email: string;
  name: string;
  microsoftId: string;
  azureOid: string;
  /** Cargo del usuario en Azure AD; se usa para asignar/crear Position (cargo) en la BD */
  jobTitle?: string | null;
}
