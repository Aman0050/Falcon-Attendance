import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAttendanceSummary, getAttendanceCalendar } from '../api/attendanceApi';
import { getAdminAttendance } from '../api/adminApi';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { user, token } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [adminTab, setAdminTab] = useState<'my' | 'all'>('my');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Employee states
  const [summary, setSummary] = useState<any>(null);
  const [calendar, setCalendar] = useState<any[]>([]);

  // Admin states
  const [adminRecords, setAdminRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedDay, setSelectedDay] = useState<any>(null);

  const loadData = async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const dateStr = currentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      if (isAdmin && adminTab === 'all') {
        const records = await getAdminAttendance(dateStr);
        setAdminRecords(records.items || []);
      } else {
        const [sumRes, calRes] = await Promise.all([
          getAttendanceSummary(token, year, month),
          getAttendanceCalendar(token, year, month),
        ]);

        if (sumRes.success) setSummary(sumRes.data?.summary || null);
        if (calRes.success) setCalendar(calRes.data || []);
        else setError(calRes.error?.message || 'Failed to load calendar');
      }
    } catch {
      setError('Unable to fetch attendance history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentDate, token, adminTab])
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const today = new Date();
    if (
      nextMonthDate.getFullYear() > today.getFullYear() ||
      (nextMonthDate.getFullYear() === today.getFullYear() && nextMonthDate.getMonth() > today.getMonth())
    ) {
      return;
    }
    setCurrentDate(nextMonthDate);
  };

  const formatHours = (minutes: number) => {
    if (!minutes || minutes <= 0) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return '--:--';
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { color: '#15803D', bg: '#DCFCE7', label: 'Present', icon: 'checkmark-circle' };
      case 'ABSENT':
        return { color: '#B91C1C', bg: '#FEE2E2', label: 'Absent', icon: 'close-circle' };
      case 'HALF_DAY':
        return { color: '#B45309', bg: '#FEF3C7', label: 'Half Day', icon: 'star-half' };
      case 'ON_LEAVE':
      case 'HALF_DAY_LEAVE':
        return { color: '#1D4ED8', bg: '#DBEAFE', label: 'On Leave', icon: 'airplane' };
      case 'HOLIDAY':
        return { color: '#0F766E', bg: '#CCFBF1', label: 'Holiday', icon: 'cafe' };
      case 'SUNDAY':
        return { color: '#64748B', bg: '#F1F5F9', label: 'Sunday', icon: 'calendar' };
      case 'CHECKOUT_MISSING':
        return { color: '#D97706', bg: '#FEF3C7', label: 'Missing Out', icon: 'alert-circle' };
      case 'INSUFFICIENT_HOURS':
        return { color: '#DC2626', bg: '#FEF2F2', label: 'Low Hours', icon: 'time' };
      default:
        return { color: '#94A3B8', bg: '#F8FAFC', label: 'Not Marked', icon: 'ellipse-outline' };
    }
  };

  const renderAdminAllStaff = () => (
    <>
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={20} color="#334155" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={adminRecords}
          keyExtractor={item => item.employeeId + item.date}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#2563EB']} />
          }
          renderItem={({ item }) => {
            const st = getStatusDetails(item.status);
            return (
              <View style={[styles.adminCard, { borderLeftColor: st.color }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminEmpName}>{item.employeeName}</Text>
                  <Text style={styles.adminEmpId}>ID: {item.employeeId}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                  {(item.checkIn || item.checkOut) && (
                    <Text style={styles.adminTimeText}>
                      {formatTime(item.checkIn)} - {formatTime(item.checkOut)}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="documents-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyText}>No records for this date</Text>
            </View>
          }
        />
      )}
    </>
  );

  const renderGrid = () => {
    if (calendar.length === 0) return null;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calDayEmpty} />);
    }

    calendar.forEach((dayData, i) => {
      const dNum = i + 1;
      const st = getStatusDetails(dayData.status);
      const isMarked = dayData.status && dayData.status !== 'NOT_MARKED';

      days.push(
        <TouchableOpacity
          key={dNum}
          style={[styles.calDay, isMarked && { borderColor: st.color + '40', backgroundColor: st.bg + '40' }]}
          onPress={() => setSelectedDay(dayData)}
          disabled={!isMarked}
          activeOpacity={0.7}
        >
          <Text style={[styles.calDayNum, isMarked && { fontWeight: '700', color: '#0F172A' }]}>
            {dNum}
          </Text>
          {isMarked && <View style={[styles.calDot, { backgroundColor: st.color }]} />}
        </TouchableOpacity>
      );
    });

    return (
      <View style={styles.calendarGrid}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={styles.calHeaderDay}>
            {d}
          </Text>
        ))}
        {days}
      </View>
    );
  };

  const renderModal = () => {
    if (!selectedDay) return null;
    const st = getStatusDetails(selectedDay.status);
    const dateFormatted = new Date(selectedDay.date).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    return (
      <Modal visible={!!selectedDay} transparent animationType="fade" onRequestClose={() => setSelectedDay(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalDate}>{dateFormatted}</Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalStatusBadge, { backgroundColor: st.bg }]}>
              <Ionicons name={st.icon as any} size={18} color={st.color} />
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
      {/* Admin Toggle between My Attendance and All Staff */}
      {isAdmin && (
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, adminTab === 'my' && styles.segmentBtnActive]}
            onPress={() => setAdminTab('my')}
            activeOpacity={0.8}
          >
            <Ionicons name="person" size={14} color={adminTab === 'my' ? '#2563EB' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, adminTab === 'my' && styles.segmentBtnTextActive]}>
              My Attendance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, adminTab === 'all' && styles.segmentBtnActive]}
            onPress={() => setAdminTab('all')}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={14} color={adminTab === 'all' ? '#2563EB' : '#64748B'} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentBtnText, adminTab === 'all' && styles.segmentBtnTextActive]}>
              All Staff Records
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && adminTab === 'all' ? (
        renderAdminAllStaff()
      ) : (
        <>
          {/* Month Selector Bar */}
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading attendance record...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#2563EB']} />
              }
            >
              {/* Executive Overview Card */}
              {summary && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryTopRow}>
                    <View style={styles.heroStatBox}>
                      <Text style={styles.heroStatNumber}>{summary.attendancePercentage}%</Text>
                      <Text style={styles.heroStatLabel}>Monthly Rate</Text>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStatBox}>
                      <Text style={styles.heroStatNumber}>{formatHours(summary.totalWorkingHours * 60)}</Text>
                      <Text style={styles.heroStatLabel}>Total Hours</Text>
                    </View>
                  </View>

                  <View style={styles.chipsRow}>
                    <View style={[styles.statChip, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.chipVal, { color: '#15803D' }]}>{summary.present}</Text>
                      <Text style={[styles.chipLabel, { color: '#166534' }]}>Present</Text>
                    </View>

                    <View style={[styles.statChip, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.chipVal, { color: '#B91C1C' }]}>{summary.absent}</Text>
                      <Text style={[styles.chipLabel, { color: '#991B1B' }]}>Absent</Text>
                    </View>

                    <View style={[styles.statChip, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.chipVal, { color: '#B45309' }]}>{summary.halfDays}</Text>
                      <Text style={[styles.chipLabel, { color: '#92400E' }]}>Half Day</Text>
                    </View>

                    <View style={[styles.statChip, { backgroundColor: '#DBEAFE' }]}>
                      <Text style={[styles.chipVal, { color: '#1D4ED8' }]}>{summary.onLeave}</Text>
                      <Text style={[styles.chipLabel, { color: '#1E40AF' }]}>Leave</Text>
                    </View>

                    <View style={[styles.statChip, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.chipVal, { color: '#475569' }]}>{summary.late}</Text>
                      <Text style={[styles.chipLabel, { color: '#475569' }]}>Late</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Calendar Card */}
              <View style={styles.calendarCard}>
                <Text style={styles.calendarTitle}>Daily Breakdown</Text>
                {renderGrid()}
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>
          )}

          {renderModal()}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 0,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  heroStatBox: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 6,
  },
  statChip: {
    flex: 1,
    minWidth: '18%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  chipVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  calendarCard: {
    marginHorizontal: 16,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calHeaderDay: {
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  calDayEmpty: {
    width: '14.28%',
    height: 44,
  },
  calDay: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  calDayNum: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDate: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  modalStatusText: {
    marginLeft: 8,
    fontWeight: '700',
    fontSize: 14,
  },
  modalInfoText: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 16,
    fontWeight: '500',
  },
  modalDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  modalDetailCol: {
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  adminEmpName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminEmpId: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adminTimeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

