import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmployees, updateEmployeeStatus, resetPassword, deleteEmployee, Employee } from '../../api/adminApi';

export default function EmployeesScreen({ navigation }: any) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      setEmployees(data.items || []);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const res = await updateEmployeeStatus(id, newStatus);
      if (res.success) {
        Alert.alert('Success', res.message);
        fetchEmployees();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Employee',
      'Are you sure you want to completely delete this employee? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteEmployee(id);
              if (res.success) {
                Alert.alert('Deleted', res.message);
                fetchEmployees();
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error?.message || 'Failed to delete employee');
            }
          }
        }
      ]
    );
  };

  const handleResetPassword = async (id: number) => {
    Alert.alert(
      'Reset Password',
      'Are you sure you want to reset this employee\'s password?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await resetPassword(id);
              if (res.success) {
                Alert.alert('Password Reset', `New Temporary Password:\n\n${res.data.tempPassword}\n\nPlease share this with the employee.`);
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error?.message || 'Failed to reset password');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#d4edda' : '#f8d7da' }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? '#155724' : '#721c24' }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.employeeIdText}>ID: {item.employeeId}</Text>
      <Text style={styles.detailText}>{item.email}</Text>
      <Text style={styles.detailText}>{item.role.toUpperCase()}</Text>
      {item.department && <Text style={styles.detailText}>{item.designation} - {item.department}</Text>}
      
      <View style={styles.cardActions}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleResetPassword(item.id)}
          >
            <Ionicons name="key-outline" size={16} color="#007bff" />
            <Text style={styles.actionBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('EditEmployee', { employee: item })}
          >
            <Ionicons name="pencil-outline" size={16} color="#28a745" />
            <Text style={[styles.actionBtnText, { color: '#28a745' }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: item.status === 'active' ? '#dc3545' : '#28a745' }]}
            onPress={() => handleToggleStatus(item.id, item.status)}
          >
            <Ionicons name={item.status === 'active' ? "close-circle-outline" : "checkmark-circle-outline"} size={16} color={item.status === 'active' ? '#dc3545' : '#28a745'} />
            <Text style={[styles.actionBtnText, { color: item.status === 'active' ? '#dc3545' : '#28a745' }]}>
              {item.status === 'active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          {item.status === 'inactive' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#dc3545' }]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Employees</Text>
        <TouchableOpacity onPress={fetchEmployees} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AddEmployee', { onGoBack: fetchEmployees })}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50, // Safe area for notch
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 5,
  },
  loader: {
    marginTop: 50,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80, // Space for FAB
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  employeeIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  actionBtnText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007bff',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});
