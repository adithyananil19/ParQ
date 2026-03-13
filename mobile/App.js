import React, { useEffect, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import store from './src/redux/store';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ParkingMapScreen from './src/screens/ParkingMapScreen';
import SlotGridScreen from './src/screens/SlotGridScreen';
import BookingScreen from './src/screens/BookingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ClientLoginScreen from './src/screens/ClientLoginScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import AdminParkingSetupScreen from './src/screens/AdminParkingSetupScreen';

// Redux selectors
import { selectToken, selectIsAdmin } from './src/redux/authSlice';
import { getToken, getUser } from './src/utils/tokenStorage';
import { useDispatch } from 'react-redux';
import { setToken, setUser } from './src/redux/authSlice';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ParkingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2a5298',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'SmartPark' }}
      />
      <Stack.Screen
        name="ParkingMap"
        component={ParkingMapScreen}
        options={{ title: 'Parking Map' }}
      />
      <Stack.Screen
        name="SlotGrid"
        component={SlotGridScreen}
        options={({ route }) => ({ title: route.params?.complex?.name || 'Parking Slots' })}
      />
    </Stack.Navigator>
  );
}

function BookingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2a5298',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Book a Spot' }}
      />
    </Stack.Navigator>
  );
}

// Client App Stack (after login)
function ClientAppStack() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'ParkingTab') {
            iconName = 'parking';
          } else if (route.name === 'BookingTab') {
            iconName = 'calendar-check';
          } else if (route.name === 'SettingsTab') {
            iconName = 'cog';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2a5298',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="ParkingTab"
        component={ParkingNavigator}
        options={{ title: 'Parking' }}
      />
      <Tab.Screen
        name="BookingTab"
        component={BookingNavigator}
        options={{ title: 'Bookings' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// Admin App Stack (placeholder for now)
function AdminAppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2a5298',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: 'Admin Dashboard', headerShown: false }}
      />
      <Stack.Screen
        name="AdminParkingSetup"
        component={AdminParkingSetupScreen}
        options={{ title: 'Setup Parking Spaces' }}
      />
    </Stack.Navigator>
  );
}

// Auth Stack (login/register screens)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="ClientLogin"
        component={ClientLoginScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="AdminLogin"
        component={AdminLoginScreen}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />
    </Stack.Navigator>
  );
}

// Root Navigator component that switches between auth and app
function RootNavigator() {
  const token = useSelector(selectToken);
  const isAdmin = useSelector(selectIsAdmin);

  return (
    <NavigationContainer>
      {token ? (
        isAdmin ? <AdminAppStack /> : <ClientAppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

// App component with auth check on startup
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Try to restore token and user from AsyncStorage
        const savedToken = await getToken();
        const savedUser = await getUser();

        if (savedToken && savedUser) {
          dispatch(setToken(savedToken));
          dispatch(setUser(savedUser));
        }
      } catch (e) {
        console.error('Failed to restore token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2a5298" />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar barStyle="light-content" backgroundColor="#2a5298" />
      <AppContent />
    </Provider>
  );
}
