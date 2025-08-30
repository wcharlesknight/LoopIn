import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import WelcomeScreen from './components/WelcomeScreen';

interface UserProfile {
  displayName: string;
  email: string;
  createdAt: any;
  lastLoginAt: any;
}

function App(): React.JSX.Element {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  function onAuthStateChanged(user: FirebaseAuthTypes.User | null) {
    setUser(user);
    if (user) {
      fetchUserProfile(user.uid);
    } else {
      setUserProfile(null);
    }
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, [initializing]);

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <WelcomeScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.authenticatedContainer}>
        <View style={styles.content}>
          <Text style={styles.welcomeTitle}>🎉 Firebase + Firestore Connected!</Text>
          <Text style={styles.userText}>
            Welcome, {userProfile?.displayName || user.email}!
          </Text>
          <Text style={styles.successText}>
            Both Firebase Auth and Firestore are working correctly.
          </Text>
          
          {profileLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.userInfoContainer}>
              <Text style={styles.infoTitle}>Firebase Auth Info:</Text>
              <Text style={styles.infoText}>Email: {user.email}</Text>
              <Text style={styles.infoText}>UID: {user.uid}</Text>
              
              {userProfile && (
                <>
                  <Text style={styles.infoTitle}>Firestore Profile Data:</Text>
                  <Text style={styles.infoText}>Display Name: {userProfile.displayName}</Text>
                  <Text style={styles.infoText}>
                    Account Created: {userProfile.createdAt?.toDate?.()?.toLocaleDateString() || 'Loading...'}
                  </Text>
                  <Text style={styles.infoText}>
                    Last Login: {userProfile.lastLoginAt?.toDate?.()?.toLocaleString() || 'Loading...'}
                  </Text>
                </>
              )}
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
    color: '#2E8B57',
  },
  userText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
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

export default App;
