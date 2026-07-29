/**
 * RootNavigator — gère le flux Auth → Onboarding → App principal.
 * Chaque onglet a son propre Stack pour accéder aux pages de détail.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text, Linking, ActivityIndicator }   from 'react-native';
import { BlurView }         from 'expo-blur';
import { Home, UtensilsCrossed, Dumbbell, User } from 'lucide-react-native';
import { colors, fontFamily }    from '../theme/theme';
import { BottomNav }             from '../components/BottomNav';

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
import { OnboardingQuizScreen }          from '../screens/OnboardingQuizScreen';
import { OnboardingSlidesScreen }        from '../screens/OnboardingSlidesScreen';
import { ProgramGenerationScreen }       from '../screens/ProgramGenerationScreen';
import { ProgramReadyScreen }            from '../screens/ProgramReadyScreen';
import { ProgramTeaserScreen }           from '../screens/ProgramTeaserScreen';
import { RecipeBookScreen }             from '../screens/RecipeBookScreen';
import { RecipeDetailScreen }           from '../screens/RecipeDetailScreen';
import { ProgramAdjustmentScreen }       from '../screens/ProgramAdjustmentScreen';
import { AICoachScreen }                  from '../screens/AICoachScreen';

import { UserProfile } from '../data';
import { DailyProgressProvider } from '../context/DailyProgressContext';
import { signIn, signUp } from '../services/authService';
import { setupDemoUser } from '../services/demoService';
import { CalorieProvider }      from '../context/CalorieContext';
import { onAuthChange } from '../services/authService';
import { auth } from '../services/firebase';
import { saveUserProfile, getUserData, listenToUserData, setUserPlan, saveUserProfileAndProgram } from '../services/dbService';
import { generateProgram, saveProgram, GeneratedProgram } from '../services/programService';
import { generateFromProfile, saveMealPlan } from '../services/mealPlanService';
import { useProgramStore } from '../store/useProgramStore';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type AuthStack   = { Welcome:undefined; Login:undefined; Signup:undefined; Goal:undefined };
type HomeStack   = { HomeMain:undefined; AICoach:undefined };
type MealsStack  = { MealsMain:undefined; RecipeBook:undefined; RecipeDetail:{ recipeId:string } };
type WorkoutsStack = { WorkoutsMain:undefined; ActiveWorkout:undefined; ProgramAdjustment:undefined };
type ProfileStack  = { ProfileMain:undefined; Goals:{ isNewUser?: boolean }; History:{ isNewUser?: boolean }; Notifications:undefined; Rituals:undefined; EditProfile:undefined };
type TabList     = { Accueil:undefined; Repas:undefined; Séances:undefined; Profil:undefined };

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

import { WearablesScreen } from '../screens/WearablesScreen';

function ProfileStackScreen() {
  return (
    <ProfileSt.Navigator screenOptions={{ headerShown:false }}>
      <ProfileSt.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileSt.Screen name="Goals"         component={ProfileGoalsScreenWrapper} />
      <ProfileSt.Screen name="History"       component={ProfileHistoryScreenWrapper} />
      <ProfileSt.Screen name="Notifications" component={ProfileNotificationsScreenWrapper} />
      <ProfileSt.Screen name="Rituals"       component={ProfileRitualsScreenWrapper} />
      <ProfileSt.Screen name="EditProfile"  component={ProfileEditScreenWrapper} />
      <ProfileSt.Screen name="Wearables"    component={WearablesScreen} />
    </ProfileSt.Navigator>
  );
}

/* ─── Main tab navigator ─────────────────────────────────────────────────── */
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Accueil"   component={HomeStackScreen}    />
      <Tab.Screen name="Repas"     component={MealsStackScreen}   />
      <Tab.Screen name="Séances"   component={WorkoutsStackScreen}/>
      <Tab.Screen name="Profil"    component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
/**
 * Tunnel de conversion : la valeur AVANT le signup.
 *   splash → slides → quiz (10 q) → generating → teaser → signup → dashboard
 * Le profil + programme sont gardés en mémoire (pendingRef) et sauvegardés
 * dans Firestore au moment de la création du compte.
 */
type OnboardingScreen =
  | 'splash'       // 0. Logo + CTA unique
  | 'slides'       // 1. Mini-présentation (4 slides)
  | 'quiz'         // 2. 10 questions conversationnelles
  | 'generating'   // 3. Écran de génération (~10 s)
  | 'teaser'       // 4. Aperçu verrouillé du programme
  | 'signup'       // 5. Création de compte (minimal)
  | 'login'        //    Connexion comptes existants
  | 'ready';       //    Programme prêt (parcours re-quiz, déjà connecté)

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

  // Écoute les redirections Deep Links de paiement (ex: pureascension://?payment=success)
  React.useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (!event.url) return;
      console.log('Deep link reçu dans RootNavigator:', event.url);
      if (event.url.includes('payment=success')) {
        const uid = firebaseUid || auth.currentUser?.uid;
        if (uid) {
          try {
            await setUserPlan(uid, 'premium');
            setPlanLevel('premium');
            setStripeStatus('active');
            useProgramStore.getState().setPremium(true);
            useProgramStore.getState().setShowPaywall(false);
          } catch (err) {
            console.error('Erreur mise à jour plan après paiement:', err);
          }
        }
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [firebaseUid]);

  // Écoute la redirection Web (?payment=success)
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search.includes('payment=success')) {
      const uid = firebaseUid || auth.currentUser?.uid;
      if (uid) {
        setUserPlan(uid, 'premium').then(() => {
          setPlanLevel('premium');
          setStripeStatus('active');
          useProgramStore.getState().setPremium(true);
          useProgramStore.getState().setShowPaywall(false);
        }).catch(console.error);
      }
    }
  }, [firebaseUid]);

  // Écoute Firebase Auth — restaure la session au reload
  // et écoute en temps réel les changements du profil utilisateur sur Firestore
  React.useEffect(() => {
    let unsubDb: (() => void) | null = null;

    const unsub = onAuthChange(async user => {
      if (user) {
        setFirebaseUid(user.uid);
        setUserEmail(user.email ?? '');
        useProgramStore.getState().setUserData(userName || user.displayName || '', user.email ?? '');

        unsubDb = listenToUserData(user.uid, (data, isError) => {
          const currentStore = useProgramStore.getState();

          if (isError) {
            // Mode hors-ligne / erreur réseau : Préserver le profil et programme locaux de Zustand s'ils existent !
            if (currentStore.profile && currentStore.program) {
              setHasProfile(true);
            }
            return;
          }

          if (data) {
            const status = data.stripe_subscription_status ?? 'inactive';
            const level = data.planLevel ?? 'none';
            setStripeStatus(status);
            setPlanLevel(level);
            
            const isPrem = status === 'active' || status === 'trialing' || level === 'premium';
            useProgramStore.getState().setPremium(isPrem);

            let nameToSet = userName;
            if (data.profile) {
              // Fusionner le profil distant avec les modifications locales pour préserver les sélections
              const mergedProfile = currentStore.profile
                ? { ...data.profile, ...currentStore.profile }
                : data.profile;
              setProfile(mergedProfile as UserProfile);
              useProgramStore.getState().setProfile(mergedProfile as UserProfile);
              const fn = (mergedProfile as UserProfile).firstName;
              if (fn) {
                setUserName(fn);
                nameToSet = fn;
              }
            }
            useProgramStore.getState().setUserData(nameToSet || user.displayName || '', user.email ?? '');

            if (data.program) {
              const mergedProgram = currentStore.program || data.program;
              useProgramStore.getState().setProgram(mergedProgram as GeneratedProgram);
            }

            const hasValidLocal = !!(currentStore.profile && currentStore.program);
            const hasValidRemote = !!(data.profile && data.program);
            setHasProfile(hasValidLocal || hasValidRemote);
          } else {
            // Si la DB ne contient rien, vérifier s'il existe une version locale dans AsyncStorage
            if (currentStore.profile && currentStore.program) {
              setHasProfile(true);
            } else {
              setStripeStatus('inactive');
              setPlanLevel('none');
              useProgramStore.getState().setPremium(false);
              setHasProfile(false);
              setScreen('slides');
            }
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

  // ── Écouteur d'actions de connexion depuis la Landing Page Web ──
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleWebLogin = async (e: any) => {
      const { email, password, demo } = e.detail || {};
      try {
        if (demo) {
          const demoEmail = 'demo@pureascension.com';
          const demoPass  = 'puredemo';
          let user;
          try {
            user = await signIn(demoEmail, demoPass);
          } catch {
            user = await signUp(demoEmail, demoPass, 'Benoît Bêta');
          }
          if (user) {
            await setupDemoUser(user.uid);
            setAuthed(true);
            setHasProfile(true);
          }
        } else if (email && password) {
          const user = await signIn(email.trim(), password);
          if (user) {
            setAuthed(true);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la connexion web :', err);
      }
    };
    window.addEventListener('LOGIN_ACTION', handleWebLogin);

    // ── Prise en charge des ancres URL web (#connexion, #login, #signup, #quiz) ──
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('connexion') || hash.includes('login')) {
        setScreen('login');
      } else if (hash.includes('inscription') || hash.includes('signup')) {
        setScreen('signup');
      } else if (hash.includes('quiz')) {
        setScreen('quiz');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    return () => {
      window.removeEventListener('LOGIN_ACTION', handleWebLogin);
      window.removeEventListener('hashchange', checkHash);
    };
  }, []);

  // Indicateur de chargement fluide pendant l'initialisation Firebase (évite l'écran vert vide)
  if (!authReady || (authed && hasProfile === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.sand[50], justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.sage[500]} />
      </View>
    );
  }

  // ── Connecté MAIS quiz jamais complété → quiz obligatoire ──
  if (authed && !hasProfile) {
    if (screen === 'slides')
      return (
        <OnboardingSlidesScreen
          onDone={() => setScreen('quiz')}
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
      <OnboardingQuizScreen
        initialName={userName}
        onBack={() => setScreen('slides')}
        onComplete={async (p) => {
          setProfile(p);
          useProgramStore.getState().setProfile(p);
          if (p.firstName) setUserName(p.firstName);
          useProgramStore.getState().setUserData(p.firstName || '', userEmail || auth.currentUser?.email || '');
          const prog = generateProgram(p);
          useProgramStore.getState().setProgram(prog);
          try {
            const mealPlan = generateFromProfile(p, prog.calories, prog.macros);
            await saveMealPlan(firebaseUid || auth.currentUser?.uid || null, mealPlan);
          } catch (e) {
            console.warn('Génération plan alimentaire:', e);
          }
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
            setAuthed(true);
          }}
        />
      );

    // ── 2. Connexion comptes existants ──
    if (screen === 'login')
      return (
        <LoginScreen
          onBack={() => setScreen('splash')}
          onSuccess={() => {
            setAuthed(true);
            const p = useProgramStore.getState().program;
            if (p) {
              setHasProfile(true);
            }
          }}
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
    <CalorieProvider
      key={storeProgram?.id ?? 'no-program'}
      initialGoal={storeProgram?.calories ?? 1800}
    >
      <DailyProgressProvider>
        <MainTabs userName={userName} userEmail={userEmail} />
      </DailyProgressProvider>
    </CalorieProvider>
  );
};

export default RootNavigator;
