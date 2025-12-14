import {FirebaseFirestoreTypes} from '@react-native-firebase/firestore';

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  lastLoginAt: FirebaseFirestoreTypes.Timestamp;
  location?: {
    cityId: string;
    cityName: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    savedAt: FirebaseFirestoreTypes.Timestamp;
  };
  hasCompletedOnboarding: boolean;
}
