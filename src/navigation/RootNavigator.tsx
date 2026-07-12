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
import { SplashScreen }           from '../screens/SplashScreen';
import { LoginScreen }            from '../screens/LoginScreen';
import { SignupScreen }           from '../screens/SignupScreen';
import { HomeScreen }             from '../screens/HomeScreen';
import { MealsScreen }            from '../screens/MealsScreen';
import { WorkoutsScreen }         from '../screens/WorkoutsScreen';
import { ProfileScreen }          from '../screens/ProfileScreen';
import { ActiveWorkoutScreen }    from '../screens/ActiveWorkoutScreen';
import { ProfileGoalsScreen }     from '../screens/profile/ProfileGoalsScreen';
import { ProfileHistoryScreen }   from '../screens/profile/ProfileHistoryScreen';
import { ProfileNotificationsScreen } from '../screens/profile/ProfileNotificationsScreen';
import { ProfileRitualsScreen }        from '../screens/profile/ProfileRitualsScreen';
import { ProfileEditScreen }           from '../screens/profile/ProfileEditScreen';
import { OnboardingDiagnosticScreen }    from '../screens/OnboardingDiagnosticScreen';
import { OnboardingSlidesScreen }        from '../screens/OnboardingSlidesScreen';
import { ProgramGenerationScreen }       from '../screens/ProgramGenerationScreen';
import { ProgramReadyScreen }            from '../screens/ProgramReadyScreen';
import { ProgramTeaserScreen }           from '../screens/ProgramTeaserScreen';
import { EquilibreScreen }              from '../screens/EquilibreScreen';

import { UserProfile } from '../data';
import { DailyProgressProvider } from '../context/DailyProgressContext';
import { CalorieProvider }      from '../context/CalorieContext';
import { onAuthChange } from '../services/authService';
import { saveUserProfile, getUserData } from '../services/dbService';
import { generateProgram, saveProgram, GeneratedProgram } from '../services/programService';
import { useProgramStore } from '../store/useProgramStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type AuthStack   = { Welcome:undefined; Login:undefined; Signup:undefined; Goal:undefined };
type HomeStack   = { HomeMain:undefined };
type MealsStack  = { MealsMain:undefined };
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
/**
 * Tunnel de conversion : la valeur AVANT le signup.
 *   splash → slides → diagnostic (10 q) → generating → teaser → signup → dashboard
 * Le profil + programme sont gardés en mémoire (pendingRef) et sauvegardés
 * dans Firestore au moment de la création du compte.
 */
type OnboardingScreen =
  | 'splash'       // 0. Logo + CTA unique
  | 'slides'       // 1. Mini-présentation (4 slides)
  | 'diagnostic'   // 2. 10 questions conversationnelles
  | 'generating'   // 3. Écran de génération (~10 s)
  | 'teaser'       // 4. Aperçu verrouillé du programme
  | 'signup'       // 5. Création de compte (minimal)
  | 'login'        //    Connexion comptes existants
  | 'ready';       //    Programme prêt (parcours re-diagnostic, déjà connecté)

export const RootNavigator: React.FC = () => {
  const [authed,      setAuthed]      = useState(false);
  const [authReady,   setAuthReady]   = useState(false); // Firebase a répondu
  const [hasProfile,  setHasProfile]  = useState<boolean | null>(null); // null = vérification Firestore en cours
  const [screen,      setScreen]      = useState<OnboardingScreen>('splash');
  const [profile,     setProfile]     = useState<UserProfile | null>(null);
  const [userName,    setUserName]    = useState('');
  const [userEmail,   setUserEmail]   = useState('');
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const storeProgram = useProgramStore(s => s.program);

  // Profil + programme générés AVANT le signup, en attente de sauvegarde
  const pendingRef = React.useRef<{ profile: UserProfile; program: GeneratedProgram } | null>(null);

  // Écoute Firebase Auth — restaure la session au reload
  // et vérifie si l'utilisateur a complété son diagnostic (profil Firestore)
  React.useEffect(() => {
    const unsub = onAuthChange(async user => {
      if (user) {
        setFirebaseUid(user.uid);
        setUserEmail(user.email ?? '');

        if (pendingRef.current) {
          // Signup en fin de tunnel : on persiste le diagnostic pré-auth
          const { profile: pp, program: pg } = pendingRef.current;
          try {
            await saveUserProfile(user.uid, pp, pp.mainGoal || 'muscle');
            await saveProgram(user.uid, pg);
          } catch {} // le programme reste en mémoire même si le réseau échoue
          setProfile(pp);
          setUserName(pp.firstName ?? user.displayName ?? '');
          useProgramStore.getState().setProgram(pg);
          setHasProfile(true);
          pendingRef.current = null;
        } else {
          setUserName(user.displayName ?? '');
          // Sans profil ET programme Firestore → onboarding forcé, jamais le dashboard
          try {
            const data = await getUserData(user.uid);
            const ok = !!(data && data.profile && data.program);
            setHasProfile(ok);
            if (data?.profile) {
              setProfile(data.profile as UserProfile);
              const fn = (data.profile as UserProfile).firstName;
              if (fn) setUserName(fn);
            }
            useProgramStore.getState().setProgram(ok ? (data!.program as GeneratedProgram) : null);
          } catch {
            setHasProfile(false);
            useProgramStore.getState().clear();
          }
        }
        setAuthed(true);
      } else {
        setFirebaseUid(null);
        setAuthed(false);
        setHasProfile(null);
        setScreen('splash');
        useProgramStore.getState().clear();
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Affiche rien pendant que Firebase vérifie la session / le profil
  if (!authReady || (authed && hasProfile === null)) return null;

  // ── Connecté MAIS diagnostic jamais complété → diagnostic obligatoire ──
  if (authed && !hasProfile) {
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
    return (
      <OnboardingDiagnosticScreen
        onBack={() => {}}
        onComplete={async (p) => {
          setProfile(p);
          if (p.firstName) setUserName(p.firstName);
          const prog = generateProgram(p);
          useProgramStore.getState().setProgram(prog);
          if (firebaseUid) {
            await saveUserProfile(firebaseUid, p, p.mainGoal || 'muscle').catch(() => {});
            await saveProgram(firebaseUid, prog).catch(() => {});
          }
          setScreen('generating');
        }}
      />
    );
  }

  if (!authed) {
    // ── 0. Splash — CTA unique, zéro friction ──
    if (screen === 'splash')
      return (
        <SplashScreen
          onStart={() => setScreen('slides')}
          onLogin={() => setScreen('login')}
        />
      );

    // ── 1. Mini-présentation (4 slides) ──
    if (screen === 'slides')
      return (
        <OnboardingSlidesScreen
          onDone={() => setScreen('diagnostic')}
        />
      );

    // ── 2. Diagnostic 10 questions — AVANT le signup ──
    if (screen === 'diagnostic')
      return (
        <OnboardingDiagnosticScreen
          onBack={() => setScreen('slides')}
          onComplete={(p) => {
            setProfile(p);
            if (p.firstName) setUserName(p.firstName);
            const prog = generateProgram(p);
            useProgramStore.getState().setProgram(prog);
            pendingRef.current = { profile: p, program: prog };
            setScreen('generating');
          }}
        />
      );

    // ── 3. Génération (~10 s, perception de valeur) ──
    if (screen === 'generating' && profile)
      return (
        <ProgramGenerationScreen
          profile={profile}
          onDone={() => setScreen('teaser')}
        />
      );

    // ── 4. Teaser — la valeur est créée, le signup vient après ──
    if (screen === 'teaser' && storeProgram)
      return (
        <ProgramTeaserScreen
          program={storeProgram}
          firstName={profile?.firstName ?? ''}
          onSignup={() => setScreen('signup')}
          onLogin={() => setScreen('login')}
        />
      );

    // ── 5. Signup minimal (email + mot de passe) ──
    if (screen === 'signup')
      return (
        <SignupScreen
          onBack={() => setScreen(pendingRef.current ? 'teaser' : 'splash')}
          initialName={profile?.firstName}
          onSuccess={(name, email) => { setUserName(name); setUserEmail(email); }}
        />
      );

    // ── Connexion comptes existants ──
    if (screen === 'login')
      return (
        <LoginScreen
          onBack={() => setScreen(pendingRef.current ? 'teaser' : 'splash')}
          onSuccess={() => {}}
          onForgot={() => {}}
        />
      );

    // Fallback : retour au splash
    return (
      <SplashScreen
        onStart={() => setScreen('slides')}
        onLogin={() => setScreen('login')}
      />
    );
  }

  return (
    <DailyProgressProvider>
      {/* Objectif calorique réel issu du diagnostic — plus de valeur hardcodée */}
      <CalorieProvider
        key={storeProgram?.id ?? 'no-program'}
        initialGoal={storeProgram?.calories ?? 1800}
      >
        <MainTabs userName={userName} userEmail={userEmail} />
      </CalorieProvider>
    </DailyProgressProvider>
  );
};

export default RootNavigator;
