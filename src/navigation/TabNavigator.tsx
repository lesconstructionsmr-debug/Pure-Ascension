import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Home, UtensilsCrossed, Dumbbell, User } from 'lucide-react-native';
import { colors, fontFamily } from '../theme/theme';
import { HomeScreen }     from '../screens/HomeScreen';
import { MealsScreen }    from '../screens/MealsScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';
import { ProfileScreen }  from '../screens/ProfileScreen';

export type RootTabParamList = { Accueil:undefined; Repas:undefined; Séances:undefined; Profil:undefined; };
const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ name, focused }: { name: keyof RootTabParamList; focused: boolean }) {
  const color=focused?colors.sage[600]:colors.ink[500], sw=focused?2.4:1.8, sz=24;
  const icons: Record<keyof RootTabParamList, React.ReactNode> = {
    Accueil: <Home            size={sz} color={color} strokeWidth={sw}/>,
    Repas:   <UtensilsCrossed size={sz} color={color} strokeWidth={sw}/>,
    Séances: <Dumbbell        size={sz} color={color} strokeWidth={sw}/>,
    Profil:  <User            size={sz} color={color} strokeWidth={sw}/>,
  };
  return (
    <View style={{ alignItems:'center', justifyContent:'center', gap:3 }}>
      {icons[name]}
      {focused && <View style={{ width:4, height:4, borderRadius:2, backgroundColor:colors.sage[600] }} />}
    </View>
  );
}

export const TabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        position:'absolute', borderTopWidth:0.5, borderTopColor:colors.ink[200],
        height:Platform.OS==='ios'?82:64, paddingBottom:Platform.OS==='ios'?24:8,
        paddingTop:8, backgroundColor:'transparent', elevation:0,
      },
      tabBarBackground: () =>
        Platform.OS==='ios'
          ? <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}/>
          : <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(251,248,243,0.96)'}]}/>,
      tabBarIcon: ({ focused }) => <TabIcon name={route.name as keyof RootTabParamList} focused={focused}/>,
      tabBarLabel: ({ focused, children }) => (
        <Text style={{ fontFamily:focused?fontFamily.hanken.semiBold:fontFamily.hanken.regular, fontSize:10, color:focused?colors.sage[600]:colors.ink[500], letterSpacing:0.3 }}>
          {children}
        </Text>
      ),
      tabBarActiveTintColor:   colors.sage[600],
      tabBarInactiveTintColor: colors.ink[500],
    })}
  >
    <Tab.Screen name="Accueil" component={HomeScreen}/>
    <Tab.Screen name="Repas"   component={MealsScreen}/>
    <Tab.Screen name="Séances" component={WorkoutsScreen}/>
    <Tab.Screen name="Profil"  component={ProfileScreen}/>
  </Tab.Navigator>
);
export default TabNavigator;
