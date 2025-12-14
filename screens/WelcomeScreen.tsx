import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const WelcomeScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      Alert.alert('Error', 'Please enter your display name');
      return;
    }

    // Validate password strength for sign-up
    if (isSignUp && password.length < 6) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 6 characters long.\n\n' +
        'For a strong password, use:\n' +
        '• At least 8 characters\n' +
        '• Mix of uppercase and lowercase letters\n' +
        '• Include numbers\n' +
        '• Add special characters (!@#$%^&*)'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        // Create auth account
        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        const userId = userCredential.user.uid;

        // Update auth profile
        await userCredential.user.updateProfile({
          displayName: displayName.trim(),
        });

        // Create Firestore profile
        await firestore().collection('users').doc(userId).set({
          displayName: displayName.trim(),
          email: email,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
          hasCompletedOnboarding: false,
        });

        Alert.alert('Success', 'Account created successfully!');
      } else {
        // Sign in
        const userCredential = await auth().signInWithEmailAndPassword(email, password);

        // Update last login timestamp
        await firestore().collection('users').doc(userCredential.user.uid).update({
          lastLoginAt: firestore.FieldValue.serverTimestamp(),
        });

        Alert.alert('Success', 'Signed in successfully!');
      }
    } catch (error: any) {
      console.log(error, "error")

      // Handle specific Firebase auth errors with user-friendly messages
      let errorMessage = error.message;

      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.\n\n' +
          'Please use a stronger password:\n' +
          '• At least 6 characters (8+ recommended)\n' +
          '• Mix of uppercase and lowercase\n' +
          '• Include numbers and special characters';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in or use a different email.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.\n\n' +
          'Please check:\n' +
          '• Email is spelled correctly\n' +
          '• Password is correct\n' +
          '• Account exists (try signing up if you haven\'t)';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show mission statement first
  if (!showAuthForm) {
    return (
      <View style={styles.container}>
        <View style={styles.landingContent}>
          <Text style={styles.logo}>Gatherus</Text>

          <View style={styles.missionContainer}>
            <Text style={styles.welcomeText}>Welcome to Gatherus</Text>
            <Text style={styles.missionText}>
              Where our goal is to bring people together. In the age of digital
              community and online presence, we think real life connection has
              taken a backseat. We plan to help bring back that social bond that
              is an essential part of the human experience.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => setShowAuthForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show auth form after "Get Started" is clicked
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Gatherus</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create your account' : 'Sign in to continue'}
        </Text>

        <View style={styles.inputContainer}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : 'Need an account? Sign Up'
            }
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowAuthForm(false)}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Landing page styles
  landingContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    textAlign: 'center',
    color: '#007AFF',
    marginTop: 40,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 122, 255, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  missionContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  missionText: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 8,
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  // Auth form styles
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: '#007AFF',
    fontSize: 16,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  backText: {
    color: '#666',
    fontSize: 16,
  },
});

export default WelcomeScreen;