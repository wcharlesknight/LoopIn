import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {City} from '../constants/cities';

export async function saveUserLocation(city: City): Promise<void> {
  const user = auth().currentUser;

  if (!user) {
    throw new Error('No authenticated user');
  }

  await firestore()
    .collection('users')
    .doc(user.uid)
    .update({
      location: {
        cityId: city.id,
        cityName: city.name,
        state: city.state,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        savedAt: firestore.FieldValue.serverTimestamp(),
      },
      hasCompletedOnboarding: true,
    });
}
