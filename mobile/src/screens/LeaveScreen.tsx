import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getLeaveBalances, getLeaveHistory, applyLeave, cancelLeaveRequest, LeaveBalance, LeaveRequest } from '../api/leaveApi';

export default function LeaveScreen() {
  const { token } = useAuth();
  
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form states
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
    if (balRes.success) setBalance(balRes.data);
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
    
    // Check if total days > balance and show confirmation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      Alert.alert('Error', 'Start date must be before end date.');
      return;
    }
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const available = balance?.currentBalance || 0;
    
    if (totalDays > available) {
      const lwp = totalDays - available;
      Alert.alert(
        'Warning', 
        `You have ${available} days of balance. ${lwp} days will be marked as Leave Without Pay. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => submitLeaveRequest() }
        ]
      );
    } else {
      submitLeaveRequest();
    }
  };
  
  const submitLeaveRequest = async () => {
    if (!token) return;
    setApplying(true);
    const res = await applyLeave(token, { startDate, endDate, reason });
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
                <Text style={styles.sectionTitle}>Leave Overview</Text>
                
                {balance && balance.eligible ? (
                  <View style={styles.dashboardCard}>
                    <View style={styles.balanceGrid}>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Annual</Text>
                        <Text style={styles.balanceValue}>18</Text>
                      </View>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Accrued</Text>
                        <Text style={styles.balanceValue}>{balance.accruedLeave}</Text>
                      </View>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Used</Text>
                        <Text style={styles.balanceValue}>{balance.usedPaidLeave}</Text>
                      </View>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>Available</Text>
                        <Text style={[styles.balanceValue, { color: '#28a745' }]}>{balance.currentBalance}</Text>
                      </View>
                      <View style={styles.balanceItem}>
                        <Text style={styles.balanceLabel}>LWP</Text>
                        <Text style={[styles.balanceValue, { color: '#dc3545' }]}>{balance.leaveWithoutPay}</Text>
                      </View>
                    </View>
                    <View style={styles.footerRow}>
                      <Text style={styles.footerText}>Next Credit: {balance.lastCreditDate ? 'Q-Next' : 'Not Credited Yet'}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.dashboardCard}>
                    <Text style={styles.notEligibleText}>You are not yet eligible for Paid Leaves or leaves have not been initialized.</Text>
                  </View>
                )}
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
  balancesContainer: { marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333' },
  dashboardCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  balanceItem: { width: '30%', alignItems: 'center', marginBottom: 15 },
  balanceLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  balanceValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  footerRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#888' },
  notEligibleText: { textAlign: 'center', color: '#dc3545', marginVertical: 10 },
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
