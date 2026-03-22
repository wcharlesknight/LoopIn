import auth from '@react-native-firebase/auth';
import {BACKEND_URL} from '../constants/api';

async function getAuthHeader(): Promise<string> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  const idToken = await user.getIdToken();
  return `Bearer ${idToken}`;
}

export async function updateLocation(cityId: string): Promise<void> {
  const authorization = await getAuthHeader();
  const res = await fetch(`${BACKEND_URL}/api/users/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({cityId}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save location');
  }
}

export async function ensureProfile(): Promise<void> {
  const authorization = await getAuthHeader();
  await fetch(`${BACKEND_URL}/api/users/ensure-profile`, {
    method: 'POST',
    headers: {Authorization: authorization},
  }).catch(err => console.warn('ensure-profile failed:', err));
}
