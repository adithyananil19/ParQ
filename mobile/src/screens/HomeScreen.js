import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getParkingOccupancy } from '../redux/parkingSlice';
import ParkingStats from '../components/ParkingStats';
import AvailableSpaces from '../components/AvailableSpaces';

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const occupancy = useSelector(state => state.parking.occupancy);
  const loading = useSelector(state => state.parking.loading);
  const error = useSelector(state => state.parking.error);

  useEffect(() => {
    // Fetch parking occupancy on mount
    dispatch(getParkingOccupancy());
    
    // Set up polling for real-time updates every 5 seconds
    const interval = setInterval(() => {
      dispatch(getParkingOccupancy());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  if (loading && !occupancy) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2a5298" />
        <Text style={styles.loadingText}>Loading parking data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Error: {error}</Text>
        <Text style={styles.errorSubtext}>Check if backend is running at 192.168.1.4:8000</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🅿️ Parking Overview</Text>
      </View>

      {occupancy ? (
        <View style={styles.content}>
          <ParkingStats occupancy={occupancy} />
          <AvailableSpaces
            spaces={occupancy.available_spaces || 0}
            onSelectSpace={() => navigation.navigate('ParkingMap')}
          />
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.noData}>No parking data available</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2a5298',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 15,
  },
});
