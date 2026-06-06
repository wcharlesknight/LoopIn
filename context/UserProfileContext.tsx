import React, {createContext, useContext, useEffect, useState} from 'react';
import firestore from '@react-native-firebase/firestore';
import {ensureProfile} from '../api/user';
import {UserProfile} from '../types';
import {useFcmToken} from '../hooks/useFcmToken';

interface UserProfileContextType {
  userProfile: UserProfile | null;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType>({
  userProfile: null,
  loading: true,
});

interface Props {
  uid: string;
  children: React.ReactNode;
}

export function UserProfileProvider({uid, children}: Props) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Backfill any missing profile fields once on session start
  useEffect(() => {
    ensureProfile();
  }, [uid]);

  useFcmToken(uid);

  // Single Firestore listener for this session
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(
        doc => {
          const data = doc.data();
          if (data) {
            setUserProfile({
              displayName: data.displayName,
              email: data.email,
              createdAt: data.createdAt?.toMillis?.() ?? 0,
              lastLoginAt: data.lastLoginAt?.toMillis?.() ?? 0,
              hasCompletedOnboarding: data.hasCompletedOnboarding ?? false,
              location: data.location
                ? {
                    cityId: data.location.cityId,
                    cityName: data.location.cityName,
                    state: data.location.state,
                    country: data.location.country,
                    latitude: data.location.latitude,
                    longitude: data.location.longitude,
                    savedAt: data.location.savedAt?.toMillis?.() ?? 0,
                  }
                : undefined,
            });
          }
          setLoading(false);
        },
        error => {
          console.error('Error fetching user profile:', error);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, [uid]);

  return (
    <UserProfileContext.Provider value={{userProfile, loading}}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextType {
  return useContext(UserProfileContext);
}
