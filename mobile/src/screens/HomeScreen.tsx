import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentLocation } from '../services/locationService';
import { getTodayAttendance, checkIn, checkOut, AttendanceRecord } from '../api/attendanceApi';

export default function HomeScreen() {
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const loadAttendance = async () => {
    if (!token) return;
    try {
      const res = await getTodayAttendance(token);
      if (res.success && res.data?.attendance) {
        setAttendance(res.data.attendance);
      } else {
        setAttendance(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [token])
  );

  const handleAction = async (action: 'check-in' | 'check-out') => {
    setLoading(true);
    try {
      // 1. Get GPS
      const locData = await getCurrentLocation();
      
      // 2. Perform Check In/Out
      const result = action === 'check-in' 
        ? await checkIn(locData.latitude, locData.longitude, locData.accuracy, token!)
        : await checkOut(locData.latitude, locData.longitude, locData.accuracy, token!);

      if (result.success) {
        Alert.alert('Success', action === 'check-in' ? 'Attendance marked' : 'Checked out successfully');
        loadAttendance();
      } else {
        Alert.alert(action === 'check-in' ? 'Attendance not marked' : 'Checkout failed', result.error?.message || 'Verification failed');
      }
    } catch (err: any) {
      Alert.alert('Unable to verify your location', err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '--:--';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  // Determine what UI state to show based on authorative backend status
  const status = attendance?.status || 'NOT_MARKED';
  const hasCheckedIn = !!attendance?.checkIn;
  const hasCheckedOut = !!attendance?.checkOut;

  const statusDisplayMap: Record<string, string> = {
    'NOT_MARKED': 'Attendance not marked',
    'ABSENT': 'Attendance marked as absent',
    'PRESENT': hasCheckedOut ? 'Attendance completed' : 'Checked In',
    'HALF_DAY': 'Half Day',
    'ON_LEAVE': 'On Leave',
    'HALF_DAY_LEAVE': 'Half-Day Leave',
    'CHECKOUT_MISSING': 'Checkout Missing',
    'INSUFFICIENT_HOURS': 'Insufficient Hours',
    'SUNDAY': 'Sunday',
    'HOLIDAY': 'Holiday'
  };

  const statusLabel = statusDisplayMap[status] || status;
  const isWeekendOrHoliday = status === 'SUNDAY' || status === 'HOLIDAY';
  // Allow check-in even if currently marked ABSENT due to passing the morning cutoff
  const showCompleted = status === 'ON_LEAVE' || isWeekendOrHoliday || hasCheckedOut;
  const todayString = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });

  if (user?.role === 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.headerRow}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>{greeting},</Text>
                <Text style={styles.userName}>{user?.name || 'Admin User'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="#444" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePill}>
            <Ionicons name="calendar" size={16} color="#007bff" />
            <Text style={styles.dateText}>{todayString}</Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="shield-checkmark" size={64} color="#007bff" style={{ marginBottom: 20 }} />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' }}>
            Welcome Admin
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 }}>
            As an administrator, you do not need to mark daily attendance. Please use the Admin tab to manage employees, review attendance, and handle leave requests.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{user?.name || 'Aman'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.datePill}>
          <Ionicons name="calendar" size={16} color="#007bff" />
          <Text style={styles.dateText}>{todayString}</Text>
        </View>
      </View>

      {/* Main Action Area */}
      <View style={styles.actionContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : showCompleted ? (
          <View style={styles.completedCard}>
            <Ionicons 
              name={
                hasCheckedOut ? "checkmark-done-circle" : 
                (status === 'ON_LEAVE' ? "calendar" : 
                 isWeekendOrHoliday ? "cafe" : "close-circle")
              } 
              size={48} 
              color={hasCheckedOut ? "#28a745" : (status === 'ON_LEAVE' ? "#17a2b8" : (isWeekendOrHoliday ? "#ffc107" : "#dc3545"))} 
            />
            <Text style={[styles.completedText, { color: hasCheckedOut ? "#28a745" : (status === 'ON_LEAVE' ? "#17a2b8" : (isWeekendOrHoliday ? "#ffc107" : "#dc3545")) }]}>
              {statusLabel}
            </Text>
            {status === 'ON_LEAVE' && attendance?.leaveType && <Text style={{ color: '#666', marginTop: 5 }}>{attendance.leaveType}</Text>}
            {status === 'HOLIDAY' && attendance?.holidayName && <Text style={{ color: '#666', marginTop: 5 }}>{attendance.holidayName}</Text>}
            {status === 'SUNDAY' && <Text style={{ color: '#666', marginTop: 5 }}>Enjoy your day off!</Text>}
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.mainButton, hasCheckedIn && styles.checkoutButton]}
            onPress={() => handleAction(!hasCheckedIn ? 'check-in' : 'check-out')}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {!hasCheckedIn ? 'CHECK IN' : 'CHECK OUT'}
            </Text>
            {attendance?.isLate && !hasCheckedIn && <Text style={{ color: 'white', marginTop: 4 }}>You are late!</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Attendance Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today's Attendance</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={styles.summaryValue}>{statusLabel}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Check-in</Text>
          <Text style={styles.summaryValue}>{formatTime(attendance?.checkIn || null)} {attendance?.isLate ? '(Late)' : ''}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Check-out</Text>
          <Text style={styles.summaryValue}>{formatTime(attendance?.checkOut || null)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Working</Text>
          <Text style={styles.summaryValue}>{formatDuration(attendance?.workingMinutes || 0)}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f4f6f9', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 10 : 10 
  },
  headerContainer: { marginBottom: 30, marginTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 50, height: 50, borderRadius: 25, 
    backgroundColor: '#007bff', 
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
    shadowColor: '#007bff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  greeting: { fontSize: 14, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  logoutBtn: { 
    padding: 10, backgroundColor: '#fff', borderRadius: 12, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 
  },
  datePill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#e6f2ff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
    marginTop: 15
  },
  dateText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#007bff' },
  actionContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 120, marginBottom: 30 },
  mainButton: { backgroundColor: '#007bff', borderRadius: 16, width: '100%', paddingVertical: 20, alignItems: 'center', elevation: 4 },
  checkoutButton: { backgroundColor: '#dc3545' },
  mainButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
  completedCard: { alignItems: 'center', padding: 20 },
  completedText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryLabel: { fontSize: 16, color: '#666' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#333' },
});
