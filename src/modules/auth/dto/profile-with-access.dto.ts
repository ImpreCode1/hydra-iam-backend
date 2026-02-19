export interface PlatformResponseDto {
  name: string;
  code: string;
  url: string;
}

export interface ProfileWithAccessResponseDto {
  id: string;
  name: string;
  email: string;
  position: string | null;
  roles: string[];
  platforms: PlatformResponseDto[];
}
