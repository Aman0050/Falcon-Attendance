import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '../api/notificationApi';

export default function NotificationsScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await getNotifications(token);
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [token])
  );

  const handleMarkAsRead = async (id: number) => {
    if (!token) return;
    try {
      const res = await markAsRead(id, token);
      if (res.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await markAllAsRead(token);
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'CHECK_IN': return 'log-in';
      case 'CHECK_OUT': return 'log-out';
      case 'ABSENCE': return 'close-circle';
      case 'MISSING_CHECKOUT': return 'alert-circle';
      case 'ADMIN_DAILY_ABSENCE': return 'warning';
      default: return 'notifications';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
      case 'CHECK_OUT': return '#28a745';
      case 'ABSENCE':
      case 'ADMIN_DAILY_ABSENCE': return '#dc3545';
      case 'MISSING_CHECKOUT': return '#ffc107';
      default: return '#007bff';
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.read_at) {
      await handleMarkAsRead(item.id);
    }
    
    if (item.type === 'MISSING_CHECKOUT' || item.type === 'CHECK_IN') {
      navigation.navigate('Home' as never);
    } else if (item.type === 'ABSENT' || item.type === 'ADMIN_DAILY_ABSENCE') {
      navigation.navigate('History' as never);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read_at;
    
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, isUnread && styles.unreadCard]} 
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: getColorForType(item.type) + '20' }]}>
          <Ionicons name={getIconForType(item.type) as any} size={24} color={getColorForType(item.type)} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.message, isUnread && styles.unreadMessage]}>{item.message}</Text>
          <Text style={styles.time}>{new Date(item.sent_at).toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some(n => !n.read_at) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  markAllText: { color: '#007bff', fontSize: 16, fontWeight: '500' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 10, fontSize: 16, color: '#666' },
  listContainer: { padding: 16 },
  notificationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  unreadCard: { backgroundColor: '#f0f8ff', borderColor: '#cce5ff', borderWidth: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  message: { fontSize: 16, color: '#444' },
  unreadMessage: { fontWeight: '700', color: '#000' },
  time: { fontSize: 12, color: '#888', marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007bff', marginLeft: 8 }
});
