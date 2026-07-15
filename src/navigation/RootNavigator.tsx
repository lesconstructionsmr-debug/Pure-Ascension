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
import { RecipeBookScreen }             from '../screens/RecipeBookScreen';
import { RecipeDetailScreen }           from '../screens/RecipeDetailScreen';
import { ProgramAdjustmentScreen }       from '../screens/ProgramAdjustmentScreen';
import { AICoachScreen }                  from '../screens/AICoachScreen';

import { UserProfile } from '../data';
import { DailyProgressProvider } from '../context/DailyProgressContext';
import { CalorieProvider }      from '../context/CalorieContext';
import { onAuthChange } from '../services/authService';
import { saveUserProfile, getUserData, listenToUserData, setUserPlan, saveUserProfileAndProgram } from '../services/dbService';
import { generateProgram, saveProgram, GeneratedProgram } from '../services/programService';
import { useProgramStore } from '../store/useProgramStore';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type AuthStack   = { Welcome:undefined; Login:undefined; Signup:undefined; Goal:undefined };
type HomeStack   = { HomeMain:undefined; AICoach:undefined };
type MealsStack  = { MealsMain:undefined; RecipeBook:undefined; RecipeDetail:{ recipeId:string } };
type WorkoutsStack = { WorkoutsMain:undefined; ActiveWorkout:undefined; ProgramAdjustment:undefined };
type ProfileStack  = { ProfileMain:undefined; Goals:{ isNewUser?: boolean }; History:{ isNewUser?: boolean }; Notifications:undefined; Rituals:undefined; EditProfile:undefined };
type TabList     = { Accueil:undefined; Repas:undefined; Séances:undefined; Équilibre:undefined; Profil:undefined };

const Auth        = createNativeStackNavigator<AuthStack>();
const HomeSt      = createNativeStackNavigator<HomeStack>();
const MealsSt     = createNativeStackNavigator<MealsStack>();
const WorkoutsSt  = createNativeStackNavigator<WorkoutsStack>();
const ProfileSt   = createNativeStackNavigator<ProfileStack>();
const Tab         = createBottomTabNavigator<TabList>();

/* ─── Wrappers pour éviter les composants en ligne (React error #310) ─────── */
function ActiveWorkoutScreenWrapper({ navigation }: any) {
  return <ActiveWorkoutScreen onClose={() => navigation.goBack()} />;
}
function ProfileGoalsScreenWrapper({ navigation, route }: any) {
  return <ProfileGoalsScreen onBack={() => navigation.goBack()} isNewUser={route.params?.isNewUser} />;
}
function ProfileHistoryScreenWrapper({ navigation, route }: any) {
  return <ProfileHistoryScreen onBack={() => navigation.goBack()} isNewUser={route.params?.isNewUser} />;
}
function ProfileNotificationsScreenWrapper({ navigation }: any) {
  return <ProfileNotificationsScreen onBack={() => navigation.goBack()} />;
}
function ProfileRitualsScreenWrapper({ navigation }: any) {
  return <ProfileRitualsScreen onBack={() => navigation.goBack()} />;
}
function ProfileEditScreenWrapper({ navigation }: any) {
  return <ProfileEditScreen onBack={() => navigation.goBack()} onSave={() => navigation.goBack()} />;
}

/* ─── Stack screens ──────────────────────────────────────────────────────── */
function HomeStackScreen() {
  return (
    <HomeSt.Navigator screenOptions={{ headerShown:false }}>
      <HomeSt.Screen name="HomeMain" component={HomeScreen} />
      <HomeSt.Screen name="AICoach" component={AICoachScreen} />
    </HomeSt.Navigator>
  );
}

function MealsStackScreen() {
  return (
    <MealsSt.Navigator screenOptions={{ headerShown:false }}>
      <MealsSt.Screen name="MealsMain" component={MealsScreen} />
      <MealsSt.Screen name="RecipeBook" component={RecipeBookScreen} />
      <MealsSt.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    </MealsSt.Navigator>
  );
}

function WorkoutsStackScreen() {
  return (
    <WorkoutsSt.Navigator screenOptions={{ headerShown:false }}>
      <WorkoutsSt.Screen name="WorkoutsMain" component={WorkoutsScreen} />
      <WorkoutsSt.Screen name="ActiveWorkout" component={ActiveWorkoutScreenWrapper} />
      <WorkoutsSt.Screen name="ProgramAdjustment" component={ProgramAdjustmentScreen} />
    </WorkoutsSt.Navigator>
  );
}

function ProfileStackScreen() {
  return (
    <ProfileSt.Navigator screenOptions={{ headerShown:false }}>
      <ProfileSt.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileSt.Screen name="Goals"         component={ProfileGoalsScreenWrapper} />
      <ProfileSt.Screen name="History"       component={ProfileHistoryScreenWrapper} />
      <ProfileSt.Screen name="Notifications" component={ProfileNotificationsScreenWrapper} />
      <ProfileSt.Screen name="Rituals"       component={ProfileRitualsScreenWrapper} />
      <ProfileSt.Screen name="EditProfile"  component={ProfileEditScreenWrapper} />
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
function MainTabs() {
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
      <Tab.Screen name="Accueil"   component={HomeStackScreen}    />
      <Tab.Screen name="Repas"     component={MealsStackScreen}   />
      <Tab.Screen name="Séances"   component={WorkoutsStackScreen}/>
      <Tab.Screen name="Équilibre" component={EquilibreScreen}    />
      <Tab.Screen name="Profil"    component={ProfileStackScreen} />
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
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);
  const [planLevel,    setPlanLevel]    = useState<string | null>(null);
  const storeProgram = useProgramStore(s => s.program);
  const showPaywall = useProgramStore(s => s.showPaywall);

  // Écoute Firebase Auth — restaure la session au reload
  // et écoute en temps réel les changements du profil utilisateur sur Firestore
  React.useEffect(() => {
    let unsubDb: (() => void) | null = null;

    const unsub = onAuthChange(async user => {
      if (user) {
        setFirebaseUid(user.uid);
        setUserEmail(user.email ?? '');
        useProgramStore.getState().setUserData(userName || user.displayName || '', user.email ?? '');

        unsubDb = listenToUserData(user.uid, (data) => {
          if (data) {
            const status = data.stripe_subscription_status ?? 'inactive';
            const level = data.planLevel ?? 'none';
            setStripeStatus(status);
            setPlanLevel(level);
            
            const isPrem = status === 'active' || status === 'trialing' || level === 'premium';
            useProgramStore.getState().setPremium(isPrem);

            let nameToSet = userName;
            if (data.profile) {
              setProfile(data.profile as UserProfile);
              useProgramStore.getState().setProfile(data.profile as UserProfile);
              const fn = (data.profile as UserProfile).firstName;
              if (fn) {
                setUserName(fn);
                nameToSet = fn;
              }
            }
            useProgramStore.getState().setUserData(nameToSet || user.displayName || '', user.email ?? '');
            if (data.program) {
              useProgramStore.getState().setProgram(data.program as GeneratedProgram);
            }
            setHasProfile(!!(data.profile && data.program));
          } else {
            setStripeStatus('inactive');
            setPlanLevel('none');
            useProgramStore.getState().setPremium(false);
            setHasProfile(false);
            setScreen('slides'); // Commence le parcours onboarding pour les nouveaux utilisateurs
          }
        });

        setAuthed(true);
      } else {
        if (unsubDb) {
          unsubDb();
          unsubDb = null;
        }
        setFirebaseUid(null);
        setUserEmail('');
        setStripeStatus(null);
        setPlanLevel(null);
        setAuthed(false);
        setHasProfile(null);
        setScreen('splash');
        useProgramStore.getState().clear();
      }
      setAuthReady(true);
    });

    return () => {
      unsub();
      if (unsubDb) unsubDb();
    };
  }, []);

  // Affiche rien pendant que Firebase vérifie la session / le profil
  if (!authReady || (authed && hasProfile === null)) return null;

  // ── Connecté MAIS diagnostic jamais complété → diagnostic obligatoire ──
  if (authed && !hasProfile) {
    if (screen === 'slides')
      return (
        <OnboardingSlidesScreen
          onDone={() => setScreen('diagnostic')}
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

    return (
      <OnboardingDiagnosticScreen
        onBack={() => setScreen('slides')}
        onComplete={async (p) => {
          setProfile(p);
          useProgramStore.getState().setProfile(p);
          if (p.firstName) setUserName(p.firstName);
          useProgramStore.getState().setUserData(p.firstName || '', userEmail || auth.currentUser?.email || '');
          const prog = generateProgram(p);
          useProgramStore.getState().setProgram(prog);
          if (firebaseUid) {
            await saveUserProfileAndProgram(firebaseUid, p, prog, p.mainGoal || 'muscle').catch(() => {});
          }
          setScreen('generating');
        }}
      />
    );
  }

  // ── Paywall global d'upsell (Phase 2) ──
  if (authed && showPaywall) {
    return (
      <SubscriptionScreen
        uid={firebaseUid!}
        email={userEmail}
        onBack={() => useProgramStore.getState().setShowPaywall(false)}
        onFree={async () => {
          try {
            await setUserPlan(firebaseUid!, 'free');
            useProgramStore.getState().setShowPaywall(false);
          } catch (error) {
            console.error('Erreur lors du choix du plan gratuit :', error);
          }
        }}
      />
    );
  }

  // ── Utilisateur connecté avec profil, mais aucun abonnement actif ni plan gratuit choisi ──
  const hasAccess = stripeStatus === 'active' || stripeStatus === 'trialing' || planLevel === 'free' || planLevel === 'standard' || planLevel === 'premium';
  
  if (authed && hasProfile && !hasAccess) {
    return (
      <SubscriptionScreen
        uid={firebaseUid!}
        email={userEmail}
        onFree={async () => {
          try {
            await setUserPlan(firebaseUid!, 'free');
          } catch (error) {
            console.error('Erreur lors du choix du plan gratuit :', error);
          }
        }}
      />
    );
  }

  if (!authed) {
    // ── 0. Splash — CTA unique, zéro friction ──
    if (screen === 'splash')
      return (
        <SplashScreen
          onStart={() => setScreen('signup')}
          onLogin={() => setScreen('login')}
        />
      );

    // ── 1. Inscription minimale ──
    if (screen === 'signup')
      return (
        <SignupScreen
          onBack={() => setScreen('splash')}
          initialName=""
          onSuccess={(name, email) => {
            setUserName(name);
            setUserEmail(email);
          }}
        />
      );

    // ── 2. Connexion comptes existants ──
    if (screen === 'login')
      return (
        <LoginScreen
          onBack={() => setScreen('splash')}
          onSuccess={() => {}}
          onForgot={() => {}}
        />
      );

    // Fallback : retour au splash
    return (
      <SplashScreen
        onStart={() => setScreen('signup')}
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
