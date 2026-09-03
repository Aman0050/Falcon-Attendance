import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Platform, StatusBar, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAttendanceSummary, getAttendanceCalendar } from '../api/attendanceApi';
import { getAdminAttendance } from '../api/adminApi';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { user, token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Employee states
  const [summary, setSummary] = useState<any>(null);
  const [calendar, setCalendar] = useState<any[]>([]);
  
  // Admin states
  const [adminRecords, setAdminRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedDay, setSelectedDay] = useState<any>(null);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      
      if (user?.role === 'admin') {
        const records = await getAdminAttendance(dateStr);
        setAdminRecords(records.items || []);
      } else {
        const [sumRes, calRes] = await Promise.all([
          getAttendanceSummary(token, year, month),
          getAttendanceCalendar(token, year, month)
        ]);

        if (sumRes.success) setSummary(sumRes.data.summary);
        if (calRes.success) setCalendar(calRes.data);
        else setError(calRes.error?.message || 'Failed to load calendar');
      }
    } catch (e: any) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentDate, token])
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const today = new Date();
    // Don't allow navigating beyond current month
    if (nextMonthDate.getFullYear() > today.getFullYear() || 
       (nextMonthDate.getFullYear() === today.getFullYear() && nextMonthDate.getMonth() > today.getMonth())) {
      return;
    }
    setCurrentDate(nextMonthDate);
  };

  const formatHours = (minutes: number) => {
    if (!minutes) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  const getStatusDetails = (status: string) => {
    switch(status) {
      case 'PRESENT': return { color: '#28a745', label: 'Present', icon: 'checkmark-circle' };
      case 'ABSENT': return { color: '#dc3545', label: 'Absent', icon: 'close-circle' };
      case 'HALF_DAY': return { color: '#ffc107', label: 'Half Day', icon: 'star-half' };
      case 'ON_LEAVE': return { color: '#17a2b8', label: 'On Leave', icon: 'airplane' };
      case 'HOLIDAY': return { color: '#007bff', label: 'Holiday', icon: 'cafe' };
      case 'SUNDAY': return { color: '#6c757d', label: 'Sunday', icon: 'calendar' };
      case 'HALF_DAY_LEAVE': return { color: '#17a2b8', label: 'Half-Day Leave', icon: 'star-half' };
      case 'CHECKOUT_MISSING': return { color: '#fd7e14', label: 'Checkout Missing', icon: 'alert-circle' };
      case 'INSUFFICIENT_HOURS': return { color: '#dc3545', label: 'Insufficient Hrs', icon: 'time' };
      default: return { color: '#e9ecef', label: 'N/A', icon: 'help-circle' };
    }
  };

  if (user?.role === 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); }} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); }} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={adminRecords}
            keyExtractor={(item) => item.employeeId + item.date}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => {
              const st = getStatusDetails(item.status);
              return (
                <View style={[styles.adminRecordCard, { borderLeftColor: st.color }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{item.employeeName}</Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>{item.employeeId}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                      <Text style={{ color: st.color, fontSize: 12, fontWeight: 'bold' }}>{st.label}</Text>
                    </View>
                    {(item.checkIn || item.checkOut) && (
                      <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {formatTime(item.checkIn)} - {formatTime(item.checkOut)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#666' }}>No records found</Text>}
          />
        )}
      </SafeAreaView>
    );
  }

  const renderGrid = () => {
    if (calendar.length === 0) return null;
    
    // Get first day of month (0 = Sunday, 1 = Monday...)
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    
    // Pad empty slots at start
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calDayEmpty} />);
    }

    // Add actual days
    calendar.forEach((dayData, i) => {
      const dNum = i + 1;
      const st = getStatusDetails(dayData.status);
      
      days.push(
        <TouchableOpacity 
          key={dNum} 
          style={[styles.calDay, { borderColor: st.color }]} 
          onPress={() => setSelectedDay(dayData)}
          disabled={dayData.status === 'NOT_MARKED'}
        >
          <Text style={styles.calDayNum}>{dNum}</Text>
          {dayData.status !== 'NOT_MARKED' && (
             <View style={[styles.calDot, { backgroundColor: st.color }]} />
          )}
        </TouchableOpacity>
      );
    });

    return (
      <View style={styles.calendarGrid}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <Text key={d} style={styles.calHeaderDay}>{d}</Text>
        ))}
        {days}
      </View>
    );
  };

  const renderModal = () => {
    if (!selectedDay) return null;
    const st = getStatusDetails(selectedDay.status);
    const dateFormatted = new Date(selectedDay.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

    return (
      <Modal visible={!!selectedDay} transparent={true} animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>{dateFormatted}</Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalStatusBadge, { backgroundColor: st.color + '20' }]}>
              <Ionicons name={st.icon as any} size={20} color={st.color} />
              <Text style={[styles.modalStatusText, { color: st.color }]}>{st.label}</Text>
            </View>

            {selectedDay.status === 'HOLIDAY' && (
              <Text style={styles.modalInfoText}>Holiday: {selectedDay.holiday_name}</Text>
            )}

            {selectedDay.status === 'ON_LEAVE' && (
              <Text style={styles.modalInfoText}>Leave: {selectedDay.leave_type}</Text>
            )}

            {['PRESENT', 'HALF_DAY', 'CHECKOUT_MISSING', 'INSUFFICIENT_HOURS'].includes(selectedDay.status) && (
              <View style={styles.modalDetailsRow}>
                <View style={styles.modalDetailCol}>
                  <Text style={styles.modalLabel}>Check-in</Text>
                  <Text style={styles.modalVal}>{formatTime(selectedDay.check_in)}</Text>
                </View>
                <View style={styles.modalDetailCol}>
                  <Text style={styles.modalLabel}>Check-out</Text>
                  <Text style={styles.modalVal}>{formatTime(selectedDay.check_out)}</Text>
                </View>
                <View style={styles.modalDetailCol}>
                  <Text style={styles.modalLabel}>Working</Text>
                  <Text style={styles.modalVal}>{formatHours(selectedDay.working_minutes)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Month Selector */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthBtn}>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          {/* Summary Card */}
          {summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValMain}>{summary.attendancePercentage}%</Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValMain}>{formatHours(summary.totalWorkingHours * 60)}</Text>
                  <Text style={styles.statLabel}>Total Hours</Text>
                </View>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.statItem}><Text style={styles.statVal}>{summary.present}</Text><Text style={styles.statLabel}>Present</Text></View>
                <View style={styles.statItem}><Text style={styles.statVal}>{summary.absent}</Text><Text style={styles.statLabel}>Absent</Text></View>
                <View style={styles.statItem}><Text style={styles.statVal}>{summary.halfDays}</Text><Text style={styles.statLabel}>Half Day</Text></View>
                <View style={styles.statItem}><Text style={styles.statVal}>{summary.onLeave}</Text><Text style={styles.statLabel}>Leave</Text></View>
                <View style={styles.statItem}><Text style={styles.statVal}>{summary.late}</Text><Text style={styles.statLabel}>Late</Text></View>
              </View>
            </View>
          )}

          {/* Calendar Grid */}
          <View style={styles.calendarCard}>
            {renderGrid()}
          </View>
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {renderModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
  monthTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  monthBtn: { padding: 8 },
  error: { color: '#dc3545', fontSize: 16, marginBottom: 10 },
  retryBtn: { backgroundColor: '#007bff', padding: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  
  summaryCard: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 16, elevation: 3 },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 16, marginBottom: 16 },
  statBox: { alignItems: 'center' },
  statValMain: { fontSize: 24, fontWeight: 'bold', color: '#007bff' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', marginHorizontal: 8 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },

  calendarCard: { marginHorizontal: 16, padding: 16, backgroundColor: '#fff', borderRadius: 16, elevation: 3 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calHeaderDay: { width: '14.28%', textAlign: 'center', fontWeight: 'bold', color: '#666', marginBottom: 10 },
  calDayEmpty: { width: '14.28%', height: 40 },
  calDay: { width: '14.28%', height: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent', marginBottom: 4 },
  calDayNum: { fontSize: 16, color: '#333' },
  calDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalDate: { fontSize: 18, fontWeight: 'bold' },
  modalStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
  modalStatusText: { marginLeft: 8, fontWeight: 'bold', fontSize: 16 },
  modalInfoText: { fontSize: 16, color: '#444', marginBottom: 16 },
  modalDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  modalDetailCol: { alignItems: 'center' },
  modalLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  modalVal: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  
  adminRecordCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2, borderLeftWidth: 4 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
});
