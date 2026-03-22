export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: number;
  lastLoginAt: number;
  location?: {
    cityId: string;
    cityName: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    savedAt: number;
  };
  hasCompletedOnboarding: boolean;
}
