import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function AdminHubScreen({ navigation }: any) {
  const { user } = useAuth();

  const menuItems = [
    {
      title: 'Manage Employees',
      description: 'Add, edit, deactivate, or delete employee accounts.',
      icon: 'people',
      route: 'EmployeesList',
      color: '#007bff'
    },
    {
      title: 'Advanced Attendance',
      description: 'Filter and review detailed attendance records.',
      icon: 'calendar',
      route: 'AdvancedAttendance',
      color: '#28a745'
    },
    {
      title: 'Export Reports',
      description: 'Download monthly attendance in Excel or PDF formats.',
      icon: 'download',
      route: 'AdminReports',
      color: '#dc3545'
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Logged in as: {user?.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.card}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={32} color={item.color} />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  scrollContent: {
    padding: 20,
    gap: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
  },
});
