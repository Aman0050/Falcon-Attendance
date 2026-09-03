import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getLeaveBalances, getLeaveHistory, applyLeave, cancelLeaveRequest, LeaveBalance, LeaveRequest } from '../api/leaveApi';

export default function LeaveScreen() {
  const { token } = useAuth();
  
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form states
  const [leaveType, setLeaveType] = useState(1); // 1: Casual, 2: Sick, 3: Earned
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    const [balRes, histRes] = await Promise.all([
      getLeaveBalances(token),
      getLeaveHistory(token, 1)
    ]);
    if (balRes.success) setBalances(balRes.data);
    if (histRes.success) setHistory(histRes.data.items);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async () => {
    if (!token) return;
    if (reason.length < 3) {
      Alert.alert('Error', 'Reason must be at least 3 characters.');
      return;
    }
    setApplying(true);
    const res = await applyLeave(token, { leaveTypeId: leaveType, startDate, endDate, reason });
    setApplying(false);
    if (res.success) {
      Alert.alert('Success', 'Leave request submitted.');
      setShowApplyModal(false);
      fetchData(); // Refresh list
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to submit leave request.');
    }
  };

  const handleCancel = (id: number) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this leave request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
        if (!token) return;
        const res = await cancelLeaveRequest(token, id);
        if (res.success) {
          Alert.alert('Cancelled', 'Request cancelled successfully.');
          fetchData();
        } else {
          Alert.alert('Error', res.error?.message || 'Failed to cancel request.');
        }
      }}
    ]);
  };

  const renderBalance = ({ item }: { item: LeaveBalance }) => (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceType}>{item.leaveType}</Text>
      <Text style={styles.balanceDays}>{item.remainingDays} days remaining</Text>
    </View>
  );

  const renderHistory = ({ item }: { item: LeaveRequest }) => (
    <View style={styles.historyCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.histDates}>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</Text>
        <Text style={[styles.badge, item.status === 'APPROVED' ? styles.badgeApproved : item.status === 'REJECTED' ? styles.badgeRejected : item.status === 'PENDING' ? styles.badgePending : styles.badgeDefault]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.histType}>{item.leaveType} • {item.totalDays} day(s)</Text>
      <Text style={styles.histReason}>{item.reason}</Text>
      {item.status === 'PENDING' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
          <Text style={styles.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Leave</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={(
            <>
              <View style={styles.balancesContainer}>
                <Text style={styles.sectionTitle}>Leave Balance</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={balances}
                  keyExtractor={(item) => item.leaveType}
                  renderItem={renderBalance}
                  style={{ marginBottom: 15 }}
                />
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApplyModal(true)}>
                <Text style={styles.applyBtnText}>APPLY FOR LEAVE</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Leave Requests</Text>
            </>
          )}
          renderItem={renderHistory}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No leave requests found.</Text>}
        />
      )}

      {/* Apply Leave Modal */}
      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            
            <Text style={styles.label}>Leave Type (1: Casual, 2: Sick, 3: Earned)</Text>
            <TextInput style={styles.input} value={leaveType.toString()} onChangeText={t => setLeaveType(parseInt(t) || 1)} keyboardType="numeric" />
            
            <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} />
            
            <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} />
            
            <Text style={styles.label}>Reason</Text>
            <TextInput style={styles.input} value={reason} onChangeText={setReason} multiline />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowApplyModal(false)}>
                <Text style={styles.closeBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={applying}>
                {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>SUBMIT</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
  balancesContainer: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333' },
  balanceCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginRight: 10, elevation: 2, minWidth: 140, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  balanceType: { fontSize: 16, fontWeight: 'bold', color: '#007BFF', marginBottom: 5 },
  balanceDays: { fontSize: 14, color: '#555' },
  applyBtn: { backgroundColor: '#007BFF', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  applyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  historyCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  histDates: { fontSize: 15, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  badgeApproved: { backgroundColor: '#d4edda', color: '#155724' },
  badgePending: { backgroundColor: '#fff3cd', color: '#856404' },
  badgeRejected: { backgroundColor: '#f8d7da', color: '#721c24' },
  badgeDefault: { backgroundColor: '#e2e3e5', color: '#383d41' },
  histType: { fontSize: 14, color: '#666', marginBottom: 5 },
  histReason: { fontSize: 14, color: '#333' },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },
  cancelBtnText: { color: '#dc3545', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },
  
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  label: { fontSize: 14, color: '#555', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  closeBtn: { padding: 10, marginRight: 10 },
  closeBtnText: { color: '#666', fontWeight: 'bold' },
  submitBtn: { padding: 10, backgroundColor: '#007BFF', borderRadius: 5, minWidth: 80, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' }
});
