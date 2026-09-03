import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminHubScreen from '../screens/admin/AdminHubScreen';
import EmployeesScreen from '../screens/admin/EmployeesScreen';
import AddEmployeeScreen from '../screens/admin/AddEmployeeScreen';
import EditEmployeeScreen from '../screens/admin/EditEmployeeScreen';
import AdvancedAttendanceScreen from '../screens/admin/AdvancedAttendanceScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHub" component={AdminHubScreen} />
      <Stack.Screen name="EmployeesList" component={EmployeesScreen} />
      <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} options={{ headerShown: true, title: 'Add Employee' }} />
      <Stack.Screen name="EditEmployee" component={EditEmployeeScreen} />
      <Stack.Screen name="AdvancedAttendance" component={AdvancedAttendanceScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
    </Stack.Navigator>
  );
}
