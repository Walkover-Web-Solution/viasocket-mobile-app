import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { StyleSheet } from 'react-native';
import HomeScreen from '../screens/homeScreen';
import ConnectionsScreen from '../screens/connectionsScreen';
import FlowsTab from '../screens/flowsTab';

type TabParamList = {
  Home: undefined;
  Flows: undefined;
  Connections: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean, color: string, size: number }) => {
          let iconName = 'home';

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Flows') {
            iconName = 'waves';
          } else if (route.name === 'Connections') {
            iconName = 'link';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Flows" 
        component={FlowsTab} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Connections" 
        component={ConnectionsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
  },
});

export default TabNavigator;
