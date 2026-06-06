import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

export function useFcmToken(uid: string): void {
  useEffect(() => {
    const register = async () => {
      const authStatus = await messaging().requestPermission();
      const granted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!granted) {
        return;
      }

      try {
        await messaging().registerDeviceForRemoteMessages();
        const token = await messaging().getToken();
        await firestore().collection('users').doc(uid).update({ fcmToken: token });
        await messaging().subscribeToTopic('weekly-gather');
      } catch (error) {
        console.error('[useFcmToken] Failed to register token:', error);
      }
    };

    register();

    const unsubscribeRefresh = messaging().onTokenRefresh(async newToken => {
      try {
        await firestore().collection('users').doc(uid).update({ fcmToken: newToken });
      } catch (error) {
        console.error('[useFcmToken] Failed to update refreshed token:', error);
      }
    });

    return unsubscribeRefresh;
  }, [uid]);
}
