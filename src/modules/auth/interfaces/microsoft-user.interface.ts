/**
 * Datos del usuario devueltos por Microsoft Entra ID tras el login OIDC.
 * Usado por AuthService.loginWithMicrosoft y UsersService.findOrCreateFromMicrosoft.
 */
export interface MicrosoftUser {
  email: string;
  name: string;
  microsoftId: string;
  azureOid: string;
}
