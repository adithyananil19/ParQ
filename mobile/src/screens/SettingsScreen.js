import React, { useState } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import { clearAuth } from '../utils/tokenStorage';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          dispatch(logout());
        },
      },
    ]);
  };
  const [notifications, setNotifications] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsGroups = [
    {
      title: 'Notifications',
      items: [
        {
          label: 'Booking Reminders',
          description: 'Get notified before your booking expires',
          value: notifications,
          onToggle: setNotifications,
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          label: 'Real-Time Updates',
          description: 'Auto-refresh parking availability every 5s',
          value: realTimeUpdates,
          onToggle: setRealTimeUpdates,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          label: 'Dark Mode',
          description: 'Coming soon',
          value: darkMode,
          onToggle: setDarkMode,
          disabled: true,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* App Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.appName}>🅿️ SmartPark</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
        <Text style={styles.appDescription}>
          Intelligent parking management system powered by AI vision
        </Text>
      </View>

      {/* Settings Groups */}
      {settingsGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupCard}>
            {group.items.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.settingRow,
                  index < group.items.length - 1 && styles.settingRowBorder,
                ]}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, item.disabled && styles.disabled]}>
                    {item.label}
                  </Text>
                  <Text style={styles.settingDescription}>{item.description}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  disabled={item.disabled}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={item.value ? '#2a5298' : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Connection Info */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Connection</Text>
        <View style={styles.groupCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Backend API</Text>
            <Text style={styles.connectionValue}>192.168.1.4:8000</Text>
          </View>
        </View>
      </View>

      {/* Account */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Account</Text>
        <View style={styles.groupCard}>
          {user && (
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <Text style={styles.settingLabel}>Logged in as</Text>
              <Text style={styles.connectionValue} numberOfLines={1}>{user.email}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  logoutRow: {
    paddingVertical: 14,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#e53e3e',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#2a5298',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2a5298',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  group: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  disabled: {
    opacity: 0.4,
  },
  connectionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
});
