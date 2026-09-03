import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView, Image, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword } from '../api/profileApi';

export default function ProfileScreen() {
  const { token, logout } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    const res = await getProfile(token);
    if (res.success) {
      setProfile(res.data);
      setPhone(res.data.phone || '');
      setPhotoUrl(res.data.profilePhotoUrl || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    const res = await updateProfile(token, { phone, profilePhotoUrl: photoUrl });
    setSaving(false);
    if (res.success) {
      Alert.alert('Success', 'Profile updated successfully.');
      setShowEdit(false);
      loadProfile();
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to update.');
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    if (newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match.');

    setSaving(true);
    const res = await changePassword(token, { currentPassword, newPassword });
    setSaving(false);
    if (res.success) {
      Alert.alert('Success', 'Password changed successfully.');
      setShowPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to change password.');
    }
  };

  if (loading && !profile) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>My Profile</Text>

        {profile && (
          <View style={styles.card}>
            {profile.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}><Text style={styles.photoText}>{profile.name?.[0]}</Text></View>
            )}
            
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.designation}>{profile.designation || 'No Designation'} • {profile.department || 'No Department'}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Employee ID</Text>
              <Text style={styles.value}>{profile.employeeId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profile.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{profile.phone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Joining Date</Text>
              <Text style={styles.value}>{profile.joiningDate || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{profile.role.toUpperCase()}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowEdit(true)}>
          <Text style={styles.btnTextPrimary}>Edit Profile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnOutline} onPress={() => setShowPassword(true)}>
          <Text style={styles.btnTextOutline}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnLogout} onPress={logout}>
          <Text style={styles.btnTextLogout}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Text style={styles.inputLabel}>Profile Photo URL</Text>
            <TextInput style={styles.input} value={photoUrl} onChangeText={setPhotoUrl} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEdit(false)} style={styles.closeBtn}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveProfile} style={styles.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>SAVE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPassword} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <Text style={styles.inputLabel}>New Password (min 6 chars)</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPassword(false)} style={styles.closeBtn}><Text style={styles.closeText}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleChangePassword} style={styles.saveBtn} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>CHANGE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { 
    flex: 1, 
    backgroundColor: '#f4f6f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  scroll: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 20, elevation: 2, marginBottom: 20 },
  photo: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 10 },
  photoPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007BFF', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  photoText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  designation: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { color: '#555', fontSize: 14, fontWeight: '600' },
  value: { color: '#333', fontSize: 14 },
  
  btnPrimary: { backgroundColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnTextPrimary: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnOutline: { borderWidth: 1, borderColor: '#007BFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnTextOutline: { color: '#007BFF', fontWeight: 'bold', fontSize: 16 },
  btnLogout: { backgroundColor: '#dc3545', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  btnTextLogout: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  inputLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  closeBtn: { padding: 10, marginRight: 15 },
  closeText: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#007BFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5, minWidth: 80, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold' }
});
