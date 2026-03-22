import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useUserProfile} from '../context/UserProfileContext';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import HomeScreen from '../screens/HomeScreen';

export type AppStackParamList = {
  LocationPicker: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const {userProfile, loading} = useUserProfile();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const shouldShowLocationPicker =
    !userProfile?.location || !userProfile?.hasCompletedOnboarding;

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
