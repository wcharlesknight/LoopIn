import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CITIES, City} from '../constants/cities';
import {saveUserLocation} from '../utils/saveUserLocation';
import {AppStackParamList} from '../navigation/AppStack';

type LocationPickerNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'LocationPicker'
>;

export default function LocationPickerScreen() {
  const navigation = useNavigation<LocationPickerNavigationProp>();
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleContinue = async () => {
    if (!selectedCity) {
      Alert.alert('Error', 'Please select a city');
      return;
    }

    setLoading(true);
    try {
      await saveUserLocation(selectedCity);
      // Navigate to Home after saving
      navigation.navigate('Home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save location');
      setLoading(false);
    }
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Gatherus!</Text>
        <Text style={styles.subtitle}>Where are you located?</Text>

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select your city:</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setModalVisible(true)}
            disabled={loading}>
            <Text style={styles.dropdownText}>
              {selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : 'Select a city'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CITIES}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.cityItem,
                    selectedCity?.id === item.id && styles.cityItemSelected,
                  ]}
                  onPress={() => handleCitySelect(item)}>
                  <Text
                    style={[
                      styles.cityItemText,
                      selectedCity?.id === item.id && styles.cityItemTextSelected,
                    ]}>
                    {item.name}, {item.state}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  pickerContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#F9F9F9',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  cityItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  cityItemText: {
    fontSize: 16,
    color: '#000',
  },
  cityItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
