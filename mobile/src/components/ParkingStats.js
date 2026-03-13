import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ParkingStats({ occupancy }) {
  const occupancyPercent = occupancy 
    ? Math.round((occupancy.occupied_spaces / occupancy.total_spaces) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Available</Text>
          <Text style={styles.statValue}>{occupancy?.available_spaces || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Occupied</Text>
          <Text style={styles.statValue}>{occupancy?.occupied_spaces || 0}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{occupancy?.total_spaces || 0}</Text>
        </View>
      </View>
      
      <View style={styles.percentageContainer}>
        <Text style={styles.percentageLabel}>Lot Occupancy</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${occupancyPercent}%` }
            ]}
          />
        </View>
        <Text style={styles.percentageValue}>{occupancyPercent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a5298',
  },
  percentageContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  percentageLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  percentageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2a5298',
    textAlign: 'center',
  },
});
