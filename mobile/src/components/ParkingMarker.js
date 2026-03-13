import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker } from 'react-native-maps';

export const ParkingMarker = ({ space, onPress }) => {
  const isAvailable = space.available;

  return (
    <Marker
      coordinate={{
        latitude: space.latitude,
        longitude: space.longitude,
      }}
      onPress={() => onPress(space)}
      tracksViewChanges={false}
    >
      <TouchableOpacity
        onPress={() => onPress(space)}
        style={[
          styles.markerContainer,
          { backgroundColor: isAvailable ? '#22c55e' : '#ef4444' },
        ]}
        activeOpacity={0.7}
      >
        <Text style={styles.markerText}>{space.id}</Text>
        <Text style={styles.markerSubtext}>
          {space.floor}
          {space.section}
        </Text>
      </TouchableOpacity>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  markerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  markerSubtext: {
    fontSize: 9,
    color: '#fff',
  },
});
