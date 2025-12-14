import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {UserProfile} from '../types';
import {AppStackParamList} from '../navigation/AppStack';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'Home'
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      const unsubscribe = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          doc => {
            const data = doc.data();
            if (data) {
              setUserProfile(data as UserProfile);
            }
            setProfileLoading(false);
          },
          error => {
            console.error('Error fetching user profile:', error);
            setProfileLoading(false);
          },
        );
      return unsubscribe;
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleChangeLocation = () => {
    navigation.navigate('LocationPicker');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.authenticatedContainer}>
        <View style={styles.content}>
          <Text style={styles.welcomeTitle}>Welcome to Gatherus!</Text>
          <Text style={styles.userText}>
            Hello, {userProfile?.displayName || user?.email}!
          </Text>

          {userProfile?.location && (
            <View style={styles.locationContainer}>
              <Text style={styles.locationLabel}>Your Location:</Text>
              <Text style={styles.locationText}>
                {userProfile.location.cityName}, {userProfile.location.state}
              </Text>
              <TouchableOpacity
                style={styles.changeLocationButton}
                onPress={handleChangeLocation}>
                <Text style={styles.changeLocationButtonText}>
                  Change Location
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {profileLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.userInfoContainer}>
              <Text style={styles.infoTitle}>Info:</Text>
              <Text style={styles.infoText}>Email: {user?.email}</Text>
              {userProfile && ( <Text style={styles.infoText}>
                    Display Name: {userProfile.displayName}
                  </Text>)}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  authenticatedContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  userText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  locationContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  changeLocationButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignSelf: 'center',
  },
  changeLocationButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  userInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
    lineHeight: 20,
  },
  signOutButton: {
    backgroundColor: '#FF6B6B',
    marginHorizontal: 32,
    marginBottom: 50,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
