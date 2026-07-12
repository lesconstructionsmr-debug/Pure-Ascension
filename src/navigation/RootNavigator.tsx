/**
 * RootNavigator — gère le flux Auth → Onboarding → App principal.
 * Chaque onglet a son propre Stack pour accéder aux pages de détail.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text }   from 'react-native';
import { BlurView }         from 'expo-blur';
import { Home, UtensilsCrossed, Dumbbell, User, Leaf } from 'lucide-react-native';
import { colors, fontFamily }    from '../theme/theme';

// Screens
import { WelcomeScreen }          from '../screens/WelcomeScreen';
import { LoginScreen }            from '../screens/LoginScreen';
import { SignupScreen }           from '../screens/SignupScreen';
import { OnboardingGoalScreen }   from '../screens/OnboardingGoalScreen';
import { HomeScreen }             from '../screens/HomeScreen';
import { MealsScreen }            from '../screens/MealsScreen';
import { WorkoutsScreen }         from '../screens/WorkoutsScreen';
import { ProfileScreen }          from '../screens/ProfileScreen';
import { MealDetailScreen }       from '../screens/MealDetailScreen';
import { ActiveWorkoutScreen }    from '../screens/ActiveWorkoutScreen';
import { ProfileGoalsScreen }     from '../screens/profile/ProfileGoalsScreen';
import { ProfileHistoryScreen }   from '../screens/profile/ProfileHistoryScreen';
import { ProfileNotificationsScreen } from '../screens/profile/ProfileNotificationsScreen';
import { ProfileRitualsScreen }        from '../screens/profile/ProfileRitualsScreen';
import { ProfileEditScreen }           from '../screens/profile/ProfileEditScreen';
import { OnboardingQuestionnaireScreen } from '../screens/OnboardingQuestionnaireScreen';
import { OnboardingSlidesScreen }        from '../screens/OnboardingSlidesScreen';
import { SubscriptionScreen }            from '../screens/SubscriptionScreen';
import { ProgramGenerationScreen }       from '../screens/ProgramGenerationScreen';
import { ProgramReadyScreen }            from '../screens/ProgramReadyScreen';
import { EquilibreScreen }              from '../screens/EquilibreScreen';

import { mockMealDay, UserProfile } from '../data';
import { DailyProgressProvider } from '../context/DailyProgressContext';
import { CalorieProvider }      from '../context/CalorieContext';
import { onAuthChange } from '../services/authService';
import { saveUserProfile, getUserData } from '../services/dbService';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type AuthStack   = { Welcome:undefined; Login:undefined; Signup:undefined; Goal:undefined };
type HomeStack   = { HomeMain:undefined };
type MealsStack  = { MealsMain:undefined; MealDetail:{ mealId:string } };
type WorkoutsStack = { WorkoutsMain:undefined; ActiveWorkout:undefined };
type ProfileStack  = { ProfileMain:undefined; Goals:{ isNewUser?: boolean }; History:{ isNewUser?: boolean }; Notifications:undefined; Rituals:undefined; EditProfile:undefined };
type TabList     = { Accueil:undefined; Repas:undefined; Séances:undefined; Équilibre:undefined; Profil:undefined };

const Auth        = createNativeStackNavigator<AuthStack>();
const HomeSt      = createNativeStackNavigator<HomeStack>();
const MealsSt     = createNativeStackNavigator<MealsStack>();
const WorkoutsSt  = createNativeStackNavigator<WorkoutsStack>();
const ProfileSt   = createNativeStackNavigator<ProfileStack>();
const Tab         = createBottomTabNavigator<TabList>();

/* ─── Stack screens ──────────────────────────────────────────────────────── */
function HomeStackScreen({ userName }: { userName: string }) {
  return (
    <HomeSt.Navigator screenOptions={{ headerShown:false }}>
      <HomeSt.Screen name="HomeMain" children={() => <HomeScreen userName={userName} />} />
    </HomeSt.Navigator>
  );
}

function MealsStackScreen() {
  return (
    <MealsSt.Navigator screenOptions={{ headerShown:false }}>
      <MealsSt.Screen name="MealsMain" component={MealsScreen} />
      <MealsSt.Screen
        name="MealDetail"
        component={({ navigation, route }: any) => {
          const meal = mockMealDay.meals.find(m => m.id === route.params?.mealId) ?? mockMealDay.meals[0];
          return <MealDetailScreen meal={meal} onBack={() => navigation.goBack()} onMarkDone={() => {}} />;
        }}
      />
    </MealsSt.Navigator>
  );
}

function WorkoutsStackScreen() {
  return (
    <WorkoutsSt.Navigator screenOptions={{ headerShown:false }}>
      <WorkoutsSt.Screen name="WorkoutsMain" component={WorkoutsScreen} />
      <WorkoutsSt.Screen
        name="ActiveWorkout"
        component={({ navigation }: any) => (
          <ActiveWorkoutScreen onClose={() => navigation.goBack()} />
        )}
      />
    </WorkoutsSt.Navigator>
  );
}

function ProfileStackScreen({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <ProfileSt.Navigator screenOptions={{ headerShown:false }}>
      <ProfileSt.Screen name="ProfileMain" children={({ navigation }:any) => <ProfileScreen navigation={navigation} userName={userName} userEmail={userEmail} />} />
      <ProfileSt.Screen name="Goals"         component={({ navigation, route }:any) => <ProfileGoalsScreen onBack={() => navigation.goBack()} isNewUser={route.params?.isNewUser} />} />
      <ProfileSt.Screen name="History"       component={({ navigation, route }:any) => <ProfileHistoryScreen onBack={() => navigation.goBack()} isNewUser={route.params?.isNewUser} />} />
      <ProfileSt.Screen name="Notifications" component={({ navigation }:any) => <ProfileNotificationsScreen onBack={() => navigation.goBack()} />} />
      <ProfileSt.Screen name="Rituals"       component={({ navigation }:any) => <ProfileRitualsScreen onBack={() => navigation.goBack()} />} />
      <ProfileSt.Screen name="EditProfile"  component={({ navigation }:any) => <ProfileEditScreen onBack={() => navigation.goBack()} onSave={() => navigation.goBack()} />} />
    </ProfileSt.Navigator>
  );
}

/* ─── Tab icon ────────────────────────────────────────────────────────────── */
function TabIcon({ name, focused }: { name: keyof TabList; focused: boolean }) {
  const color = focused ? colors.sage[600] : colors.ink[500];
  const sw    = focused ? 2.4 : 1.8;
  const sz    = 24;
  const icons: Record<keyof TabList, React.ReactNode> = {
    Accueil:   <Home            size={sz} color={color} strokeWidth={sw}/>,
    Repas:     <UtensilsCrossed size={sz} color={color} strokeWidth={sw}/>,
    Séances:   <Dumbbell        size={sz} color={color} strokeWidth={sw}/>,
    Équilibre: <Leaf            size={sz} color={color} strokeWidth={sw}/>,
    Profil:    <User            size={sz} color={color} strokeWidth={sw}/>,
  };
  return (
    <View style={{ alignItems:'center', justifyContent:'center', gap:3 }}>
      {icons[name]}
      {focused && <View style={{ width:4, height:4, borderRadius:2, backgroundColor:colors.sage[600] }} />}
    </View>
  );
}

/* ─── Main tab navigator ─────────────────────────────────────────────────── */
function MainTabs({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position:'absolute', borderTopWidth:0.5, borderTopColor:colors.ink[200],
          height:Platform.OS==='ios'?82:64, paddingBottom:Platform.OS==='ios'?24:8,
          paddingTop:8, backgroundColor:'transparent', elevation:0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios'
            ? <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}/>
            : <View style={[StyleSheet.absoluteFill, { backgroundColor:'rgba(251,248,243,0.96)' }]}/>,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name as keyof TabList} focused={focused}/>,
        tabBarLabel: ({ focused, children }) => (
          <Text style={{
            fontFamily: focused ? fontFamily.hanken.semiBold : fontFamily.hanken.regular,
            fontSize:10, color: focused ? colors.sage[600] : colors.ink[500], letterSpacing:0.3,
          }}>
            {children}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Accueil"   children={() => <HomeStackScreen userName={userName} />}    />
      <Tab.Screen name="Repas"     component={MealsStackScreen}   />
      <Tab.Screen name="Séances"   component={WorkoutsStackScreen}/>
      <Tab.Screen name="Équilibre" component={EquilibreScreen}    />
      <Tab.Screen name="Profil"    children={() => <ProfileStackScreen userName={userName} userEmail={userEmail} />} />
    </Tab.Navigator>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
type OnboardingScreen =
  | 'slides'          // 1. Présentation features
  | 'subscription'    // 2. Choix plan
  | 'welcome'         // 3. Login / Signup
  | 'login'
  | 'signup'
  | 'goal'            // 4. Objectif
  | 'questionnaire'   // 5. Profil complet
  | 'generating'      // 6. Animation génération
  | 'ready';          // 7. Programme prêt

export const RootNavigator: React.FC = () => {
  const [authed,          setAuthed]          = useState(false);
  const [authReady,       setAuthReady]       = useState(false); // Firebase a répondu
  const [hasProfile,      setHasProfile]      = useState<boolean | null>(null); // null = vérification Firestore en cours
  const [screen,          setScreen]          = useState<OnboardingScreen>('slides');
  const [profile,         setProfile]         = useState<UserProfile | null>(null);
  const [userName,        setUserName]        = useState('');
  const [userEmail,       setUserEmail]       = useState('');
  const [firebaseUid,     setFirebaseUid]     = useState<string | null>(null);
  const [sportDiscipline, setSportDiscipline] = useState<string | undefined>(undefined);

  // Écoute Firebase Auth — restaure la session au reload
  // et vérifie si l'utilisateur a complété son diagnostic (profil Firestore)
  React.useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (user) {
        setFirebaseUid(user.uid);
        setUserName(user.displayName ?? '');
        setUserEmail(user.email ?? '');
        // Sans profil Firestore → onboarding forcé, jamais le dashboard
        try {
          const data = await getUserData(user.uid);
          setHasProfile(!!(data && data.profile));
          if (data?.profile) setProfile(data.profile as UserProfile);
        } catch {
          setHasProfile(false);
        }
        setAuthed(true);
      } else {
        setFirebaseUid(null);
        setAuthed(false);
        setHasProfile(null);
        setScreen('slides');
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Affiche rien pendant que Firebase vérifie la session / le profil
  if (!authReady || (authed && hasProfile === null)) return null;

  // ── Connecté MAIS diagnostic jamais complété → onboarding obligatoire ──
  if (authed && !hasProfile) {
    if (screen === 'questionnaire')
      return (
        <OnboardingQuestionnaireScreen
          onBack={() => setScreen('goal')}
          initialProfile={sportDiscipline ? { sportDiscipline } : {}}
          onComplete={async (p) => {
            setProfile(p);
            if (firebaseUid) {
              await saveUserProfile(firebaseUid, p, p.mainGoal || 'muscle').catch(() => {});
            }
            setScreen('generating');
          }}
        />
      );
    if (screen === 'generating' && profile)
      return (
        <ProgramGenerationScreen
          profile={profile}
          onDone={() => setScreen('ready')}
        />
      );
    if (screen === 'ready' && profile)
      return (
        <ProgramReadyScreen
          profile={profile}
          onStart={() => setHasProfile(true)}
        />
      );
    // Par défaut : choix de l'objectif (porte d'entrée du diagnostic)
    return (
      <OnboardingGoalScreen
        onBack={() => {}}
        onContinue={(_goalId, discipline) => {
          setSportDiscipline(discipline);
          setScreen('questionnaire');
        }}
      />
    );
  }

  if (!authed) {
    // ── 1. Slides intro ──
    // BÊTA : on bypasse le paywall, tout le monde a accès Premium gratuit
    if (screen === 'slides')
      return (
        <OnboardingSlidesScreen
          onDone={() => setScreen('welcome')}
        />
      );

    // ── 2. Paywall (désactivé en bêta) ──
    if (screen === 'subscription')
      return (
        <SubscriptionScreen
          onBack={() => setScreen('slides')}
          onFree={() => setScreen('signup')}
          onPremium={() => setScreen('signup')}
        />
      );

    // ── 3. Welcome (retour possible depuis login) ──
    if (screen === 'welcome')
      return (
        <WelcomeScreen
          onLogin={() => setScreen('login')}
          onSignup={() => setScreen('signup')}
        />
      );

    // ── 4. Login ──
    if (screen === 'login')
      return (
        <LoginScreen
          onBack={() => setScreen('welcome')}
          onSuccess={() => setAuthed(true)}
          onForgot={() => {}}
        />
      );

    // ── 5. Signup ──
    if (screen === 'signup')
      return (
        <SignupScreen
          onBack={() => setScreen('welcome')}
          onSuccess={(name, email) => { setUserName(name); setUserEmail(email); setScreen('goal'); }}
        />
      );

    // ── 6. Objectif ──
    if (screen === 'goal')
      return (
        <OnboardingGoalScreen
          onBack={() => setScreen('signup')}
          onContinue={(_goalId, discipline) => {
            setSportDiscipline(discipline);
            setScreen('questionnaire');
          }}
        />
      );

    // ── 7. Questionnaire programme ──
    if (screen === 'questionnaire')
      return (
        <OnboardingQuestionnaireScreen
          onBack={() => setScreen('goal')}
          initialProfile={sportDiscipline ? { sportDiscipline } : {}}
          onComplete={async (p) => {
            setProfile(p);
            // Sauvegarde dans Firestore si l'utilisateur est connecté
            if (firebaseUid) {
              await saveUserProfile(firebaseUid, p, p.mainGoal || 'muscle').catch(() => {});
            }
            setScreen('generating');
          }}
        />
      );

    // ── 8. Animation génération ──
    if (screen === 'generating' && profile)
      return (
        <ProgramGenerationScreen
          profile={profile}
          onDone={() => setScreen('ready')}
        />
      );

    // ── 9. Programme prêt ──
    if (screen === 'ready' && profile)
      return (
        <ProgramReadyScreen
          profile={profile}
          onStart={() => setAuthed(true)}
        />
      );
  }

  return (
    <DailyProgressProvider>
      <CalorieProvider initialGoal={1800}>
        <MainTabs userName={userName} userEmail={userEmail} />
      </CalorieProvider>
    </DailyProgressProvider>
  );
};

export default RootNavigator;
