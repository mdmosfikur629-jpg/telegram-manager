import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Auth screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Main screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import InboxScreen from '../screens/Inbox/InboxScreen';
import AccountsScreen from '../screens/Accounts/AccountsScreen';
import AutomationScreen from '../screens/Automation/AutomationScreen';
import ChatScreen from '../screens/Chat/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function InboxStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="InboxList" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2AABEE',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxStack}
        options={{ tabBarLabel: 'Messages' }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ tabBarLabel: 'Accounts' }}
      />
      <Tab.Screen
        name="Automation"
        component={AutomationScreen}
        options={{ tabBarLabel: 'Automation' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading, loadToken } = useAuthStore();

  useEffect(() => {
    loadToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2AABEE" />
      </View>
    );
  }

  return user ? <MainTabs /> : <AuthStack />;
}
