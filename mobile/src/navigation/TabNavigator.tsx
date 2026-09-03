import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GPSTestScreen from '../screens/GPSTestScreen';
import AdminNavigator from './AdminNavigator';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'GPS Test') {
            iconName = focused ? 'bug' : 'bug-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007bff',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {(user?.role === 'admin' || user?.role === 'ADMIN') && (
        <Tab.Screen name="Admin" component={AdminNavigator} />
      )}
    </Tab.Navigator>
  );
}
