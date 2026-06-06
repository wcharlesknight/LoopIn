import {BACKEND_URL} from '../constants/api';

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, displayName}),
  });

  if (res.status === 409) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Registration failed');
  }

  const {customToken} = await res.json();
  return customToken;
}

export async function syncLogin(idToken: string): Promise<void> {
  await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${idToken}`},
  }).catch(err => console.warn('Failed to sync login with backend:', err));
}
