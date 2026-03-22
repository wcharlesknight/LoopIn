import {City} from '../constants/cities';
import {updateLocation} from '../api/user';

export async function saveUserLocation(city: City): Promise<void> {
  return updateLocation(city.id);
}
