import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen }     from '../screens/HomeScreen';
import { MealsScreen }    from '../screens/MealsScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';
import { ProfileScreen }  from '../screens/ProfileScreen';
import { BottomNav }      from '../components/BottomNav';

export type RootTabParamList = { Accueil:undefined; Repas:undefined; Séances:undefined; Profil:undefined; };
const Tab = createBottomTabNavigator<RootTabParamList>();

export const TabNavigator: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <BottomNav {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen name="Accueil" component={HomeScreen}/>
    <Tab.Screen name="Repas"   component={MealsScreen}/>
    <Tab.Screen name="Séances" component={WorkoutsScreen}/>
    <Tab.Screen name="Profil"  component={ProfileScreen}/>
  </Tab.Navigator>
);
export default TabNavigator;
