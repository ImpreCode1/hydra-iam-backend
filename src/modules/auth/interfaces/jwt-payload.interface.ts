export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  roles: string[];
  positionId: string | null;
}
