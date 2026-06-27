import React, {useState} from 'react';
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
import {registerUser, syncLogin} from '../api/auth';
import {
  signInWithProvider,
  SocialProvider,
  SocialSignInCancelled,
  AccountExistsWithDifferentCredentialError,
} from '../api/socialAuth';
import SocialButton from '../components/SocialButton';

const WelcomeScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(
    null,
  );

  const handleSocial = async (provider: SocialProvider) => {
    setSocialProvider(provider);
    try {
      const user = await signInWithProvider(provider);
      // Sync with the backend so the Firestore profile is provisioned (new users) or
      // touched (returning users). Navigation is handled by onAuthStateChanged.
      const idToken = await user.getIdToken();
      syncLogin(idToken);
    } catch (error) {
      if (error instanceof SocialSignInCancelled) {
        return; // user backed out — not an error
      }
      if (error instanceof AccountExistsWithDifferentCredentialError) {
        const method = error.existingMethods[0] ?? 'a different method';
        Alert.alert(
          'Account already exists',
          `You already signed up using ${method}. Please sign in with that method first, then link this provider from settings.`,
        );
        return;
      }
      console.error(`[${provider}] Sign-in error:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Sign-in failed: ${errorMsg}`);
    } finally {
      setSocialProvider(null);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      Alert.alert('Error', 'Please enter your display name');
      return;
    }

    if (isSignUp && password.length < 6) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 6 characters long.\n\n' +
          'For a strong password, use:\n' +
          '• At least 8 characters\n' +
          '• Mix of uppercase and lowercase letters\n' +
          '• Include numbers\n' +
          '• Add special characters (!@#$%^&*)',
      );
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const customToken = await registerUser(
          email,
          password,
          displayName.trim(),
        );
        await auth().signInWithCustomToken(customToken);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        let idToken: string;
        try {
          const userCredential = await auth().signInWithEmailAndPassword(
            email,
            password,
          );
          idToken = await userCredential.user.getIdToken();
        } catch (error: any) {
          let errorMessage = error.message;
          if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
          } else if (error.code === 'auth/user-not-found') {
            errorMessage =
              'No account found with this email. Please sign up first.';
          } else if (
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/invalid-credential'
          ) {
            errorMessage =
              "Invalid email or password.\n\nPlease check:\n• Email is spelled correctly\n• Password is correct\n• Account exists (try signing up if you haven't)";
          }
          Alert.alert('Error', errorMessage);
          return;
        }

        syncLogin(idToken);
        Alert.alert('Success', 'Signed in successfully!');
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Something went wrong. Please try again.';
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        errorMessage =
          'This email is already registered. Please sign in or use a different email.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
            activeOpacity={0.8}>
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Gatherus</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create your account' : 'Sign in to continue'}
        </Text>

        <View style={styles.socialContainer}>
          <SocialButton
            label="Sign in with Google"
            badge="G"
            backgroundColor="#ffffff"
            textColor="#3c4043"
            badgeColor="#4285F4"
            bordered
            onPress={() => handleSocial('google')}
            loading={socialProvider === 'google'}
            disabled={socialProvider !== null || isLoading}
          />
          <SocialButton
            label="Sign in with Apple"
            badge=""
            backgroundColor="#000000"
            textColor="#ffffff"
            onPress={() => handleSocial('apple')}
            loading={socialProvider === 'apple'}
            disabled={socialProvider !== null || isLoading}
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or use email</Text>
          <View style={styles.dividerLine} />
        </View>

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
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : 'Need an account? Sign Up'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowAuthForm(false)}>
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
    textShadowOffset: {width: 0, height: 4},
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
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
  socialContainer: {
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontSize: 14,
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
