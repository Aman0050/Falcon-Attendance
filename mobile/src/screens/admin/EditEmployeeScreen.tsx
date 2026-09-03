import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { editEmployee } from '../../api/adminApi';
import { Ionicons } from '@expo/vector-icons';

export default function EditEmployeeScreen({ route, navigation }: any) {
  const { employee } = route.params;
  
  const [name, setName] = useState(employee.name || '');
  const [email, setEmail] = useState(employee.email || '');
  const [phone, setPhone] = useState(employee.phone || '');
  const [department, setDepartment] = useState(employee.department || '');
  const [designation, setDesignation] = useState(employee.designation || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Name and Email are required.');
      return;
    }
    try {
      setLoading(true);
      const res = await editEmployee(employee.id, {
        name, email, phone, department, designation
      });
      if (res.success) {
        Alert.alert('Success', 'Employee updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Employee</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Department</Text>
          <TextInput
            style={styles.input}
            value={department}
            onChangeText={setDepartment}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Designation</Text>
          <TextInput
            style={styles.input}
            value={designation}
            onChangeText={setDesignation}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
