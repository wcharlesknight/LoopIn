import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import HomeScreen from '../screens/HomeScreen';
import {UserProfile} from '../types';

export type AppStackParamList = {
  LocationPicker: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    if (user) {
      const unsubscribe = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          async doc => {
            const data = doc.data();
            if (data) {
              // Migration: If hasCompletedOnboarding doesn't exist, set it to false
              if (data.hasCompletedOnboarding === undefined) {
                console.log('Migrating user profile: adding hasCompletedOnboarding field');
                try {
                  await firestore()
                    .collection('users')
                    .doc(user.uid)
                    .update({
                      hasCompletedOnboarding: false,
                    });
                } catch (error) {
                  console.error('Error updating user profile:', error);
                }
                // Set the local state with the updated value
                setUserProfile({...data, hasCompletedOnboarding: false} as UserProfile);
              } else {
                setUserProfile(data as UserProfile);
              }
            }
            setLoading(false);
          },
          error => {
            console.error('Error fetching user profile:', error);
            setLoading(false);
          },
        );
      return unsubscribe;
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show location picker if no location is set or onboarding not completed
  const shouldShowLocationPicker =
    !userProfile?.location || !userProfile?.hasCompletedOnboarding;

  // Debug logging
  console.log('AppStack - User Profile:', {
    hasLocation: !!userProfile?.location,
    hasCompletedOnboarding: userProfile?.hasCompletedOnboarding,
    shouldShowLocationPicker,
    userProfile,
  });

  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={shouldShowLocationPicker ? 'LocationPicker' : 'Home'}>
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
