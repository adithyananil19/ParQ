import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AvailableSpaces({ spaces = 0, onSelectSpace }) {
  const spaceCount = typeof spaces === 'number' ? spaces : (Array.isArray(spaces) ? spaces.length : 0);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Parking Spaces</Text>
      
      <Pressable
        style={({ pressed }) => [
          styles.spaceCard,
          pressed && styles.spaceCardPressed,
        ]}
        onPress={onSelectSpace}
      >
        <MaterialCommunityIcons
          name="parking"
          size={48}
          color="#4CAF50"
        />
        <Text style={styles.spaceCount}>{spaceCount}</Text>
        <Text style={styles.spaceLabel}>spaces available</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  spaceCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  spaceCardPressed: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  spaceCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2a5298',
    marginTop: 10,
  },
  spaceLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});
