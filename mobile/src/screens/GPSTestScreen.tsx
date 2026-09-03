import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { getCurrentLocation, LocationData } from '../services/locationService';
import { validateLocationWithServer } from '../api/locationApi';
import { useAuth } from '../context/AuthContext';

export default function GPSTestScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const fetchLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    setValidationResult(null);

    try {
      const locData = await getCurrentLocation();
      setLocation(locData);

      if (token) {
        const result = await validateLocationWithServer(
          locData.latitude,
          locData.longitude,
          locData.accuracy,
          token
        );
        setValidationResult(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Falcon GPS Test</Text>
      <Text style={styles.warning}>[DEVELOPMENT ONLY]</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.card}>
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : location ? (
            <>
              <Text style={styles.label}>Location Permission: <Text style={styles.success}>Granted ✓</Text></Text>
              <Text style={styles.label}>Latitude: <Text style={styles.value}>{location.latitude}</Text></Text>
              <Text style={styles.label}>Longitude: <Text style={styles.value}>{location.longitude}</Text></Text>
              <Text style={styles.label}>Accuracy: <Text style={styles.value}>{Math.round(location.accuracy)} metres</Text></Text>
              <Text style={styles.label}>Timestamp: <Text style={styles.value}>{new Date(location.timestamp).toLocaleTimeString()}</Text></Text>
              
              {validationResult && (
                <View style={styles.validationBox}>
                  <Text style={styles.validationTitle}>Server Validation:</Text>
                  <Text>{JSON.stringify(validationResult, null, 2)}</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.placeholder}>Press refresh to test GPS</Text>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={fetchLocation} disabled={loading}>
        <Text style={styles.buttonText}>[ Refresh Location ]</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  warning: {
    color: 'orange',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  value: {
    fontWeight: 'bold',
    color: '#333',
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  placeholder: {
    color: '#999',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  validationBox: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  validationTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  }
});
