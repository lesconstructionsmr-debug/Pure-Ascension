/**
 * RootNavigator — gère le flux Auth → Onboarding → App principal.
 * Chaque onglet a son propre Stack pour accéder aux pages de détail.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, Text, Linking, ActivityIndicator }   from 'react-native';
import { Home, UtensilsCrossed, Dumbbell, User } from 'lucide-react-native';
import { colors } from '../theme/theme';
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
import { WearablesScreen }                 from '../screens/WearablesScreen';

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
type ProfileStack  = { ProfileMain:undefined; Goals:{ isNewUser?: boolean }; History:{ isNewUser?: boolean }; Notifications:undefined; Rituals:undefined; EditProfile:undefined; Wearables:undefined };
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
  const profile = useProgramStore(s => s.profile);
  return (
    <ProfileEditScreen
      currentProfile={profile ?? undefined}
      onBack={() => navigation.goBack()}
      onSave={async (p) => {
        const prev = useProgramStore.getState().profile;
        const merged = { ...(prev || {}), ...p } as UserProfile;
        useProgramStore.getState().setProfile(merged);
        const uid = auth.currentUser?.uid;
        const program = useProgramStore.getState().program;
        if (uid && program) {
          await saveUserProfileAndProgram(uid, merged, program, merged.mainGoal || 'muscle').catch(() => {});
        } else if (uid) {
          await saveUserProfile(uid, merged, merged.mainGoal || 'muscle').catch(() => {});
        }
        navigation.goBack();
      }}
    />
  );
}
function WearablesScreenWrapper({ navigation }: any) {
  return <WearablesScreen navigation={navigation} />;
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

function ProfileStackScreen() {
  return (
    <ProfileSt.Navigator screenOptions={{ headerShown:false }}>
      <ProfileSt.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileSt.Screen name="Goals"         component={ProfileGoalsScreenWrapper} />
      <ProfileSt.Screen name="History"       component={ProfileHistoryScreenWrapper} />
      <ProfileSt.Screen name="Notifications" component={ProfileNotificationsScreenWrapper} />
      <ProfileSt.Screen name="Rituals"       component={ProfileRitualsScreenWrapper} />
      <ProfileSt.Screen name="EditProfile"  component={ProfileEditScreenWrapper} />
      <ProfileSt.Screen name="Wearables"    component={WearablesScreenWrapper} />
      <ProfileSt.Screen name="ProgramAdjustment" component={ProgramAdjustmentScreen} />
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
        // Optimistic UI only — planLevel/premium vient du webhook Stripe (Admin), pas du client
        setPlanLevel('premium');
        setStripeStatus('active');
        useProgramStore.getState().setPremium(true);
        useProgramStore.getState().setShowPaywall(false);
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
      // Optimistic UI only — le webhook Stripe confirme le plan en Firestore
      setPlanLevel('premium');
      setStripeStatus('active');
      useProgramStore.getState().setPremium(true);
      useProgramStore.getState().setShowPaywall(false);
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

        // Lier l'achat StoreKit / RevenueCat au UID Firebase
        if (Platform.OS !== 'web') {
          try {
            const {
              configureRevenueCat,
              loginRevenueCat,
              hasPremiumEntitlement,
            } = await import('../services/revenueCatService');
            await configureRevenueCat();
            const info = await loginRevenueCat(user.uid);
            if (hasPremiumEntitlement(info)) {
              setPlanLevel('premium');
              setStripeStatus('active');
              useProgramStore.getState().setPremium(true);
              useProgramStore.getState().setShowPaywall(false);
            }
          } catch (err) {
            console.warn('RevenueCat login:', err);
          }
        }

        unsubDb = listenToUserData(user.uid, (data, isError) => {
          const currentStore = useProgramStore.getState();

          if (isError) {
            // Mode hors-ligne / erreur réseau : Préserver le profil et programme locaux de Zustand s'ils existent !
            if (currentStore.profile && currentStore.program) {
              setHasProfile(true);
            } else {
              setHasProfile(false);
            }
            return;
          }

          if (data) {
            const status = data.stripe_subscription_status ?? 'inactive';
            const rcStatus = data.revenuecat_subscription_status ?? 'inactive';
            const level = data.planLevel ?? 'none';
            setStripeStatus(status === 'active' || status === 'trialing' ? status : rcStatus);
            setPlanLevel(level);
            
            const isPrem =
              status === 'active' ||
              status === 'trialing' ||
              rcStatus === 'active' ||
              level === 'premium';
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

    // Filet anti-page blanche iOS : débloque TOUJOURS l'UI (ne laisse jamais hasProfile à null)
    const fallbackTimer = setTimeout(() => {
      setAuthReady(true);
      if (auth.currentUser) {
        setAuthed(true);
        setFirebaseUid(prev => prev ?? auth.currentUser!.uid);
      }
      setHasProfile(prev => {
        if (prev !== null) return prev;
        const currentStore = useProgramStore.getState();
        return !!(currentStore.profile && currentStore.program);
      });
    }, 1500);

    return () => {
      unsub();
      clearTimeout(fallbackTimer);
      if (unsubDb) unsubDb();
    };
  }, []);

  // Re-armé à chaque fois qu'on est bloqué sur authed + hasProfile null (signup/login/Firestore lent)
  React.useEffect(() => {
    if (!authed || hasProfile !== null) return;
    const t = setTimeout(() => {
      setHasProfile(prev => {
        if (prev !== null) return prev;
        const store = useProgramStore.getState();
        return !!(store.profile && store.program);
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [authed, hasProfile]);

  // Si le plan Firestore ne revient jamais, passer en free pour débloquer l'UI
  React.useEffect(() => {
    if (!authed || !hasProfile) return;
    if (stripeStatus !== null || planLevel !== null) return;
    const t = setTimeout(() => {
      setPlanLevel(prev => prev ?? 'free');
      setStripeStatus(prev => prev ?? 'inactive');
    }, 3000);
    return () => clearTimeout(t);
  }, [authed, hasProfile, stripeStatus, planLevel]);

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

  // Attente auth — fond vert marque (plus jamais crème/blanc qui paraît "cassé")
  if (!authReady || (authed && hasProfile === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2D4029', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 }}>
          Pure Ascension
        </Text>
        <ActivityIndicator size="large" color="#C5D4B8" />
        <Text style={{ marginTop: 12, fontSize: 13, color: '#9BB08A', textAlign: 'center' }}>
          Chargement de ton espace…
        </Text>
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

  // Plan encore inconnu (Firestore lent) ≠ "pas d'accès" — sinon faux paywall / crash uid null
  const planStillLoading = stripeStatus === null && planLevel === null;
  const hasAccess =
    stripeStatus === 'active' ||
    stripeStatus === 'trialing' ||
    planLevel === 'free' ||
    planLevel === 'standard' ||
    planLevel === 'premium';

  if (authed && hasProfile && planStillLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2D4029', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 }}>Pure Ascension</Text>
        <ActivityIndicator size="large" color="#C5D4B8" />
        <Text style={{ marginTop: 12, fontSize: 13, color: '#9BB08A' }}>Préparation de ton accès…</Text>
      </View>
    );
  }

  if (authed && hasProfile && !hasAccess) {
    if (!firebaseUid) {
      return (
        <View style={{ flex: 1, backgroundColor: '#2D4029', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 }}>Session incomplète</Text>
          <Text style={{ fontSize: 13, color: '#9BB08A', textAlign: 'center' }}>Reconnecte-toi pour continuer.</Text>
        </View>
      );
    }
    return (
      <SubscriptionScreen
        uid={firebaseUid}
        email={userEmail}
        onFree={async () => {
          try {
            await setUserPlan(firebaseUid, 'free');
            setPlanLevel('free');
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

    // ── 0. Quiz Onboarding ──
    if (screen === 'quiz')
      return (
        <OnboardingQuizScreen
          initialName={userName}
          onBack={() => setScreen('splash')}
          onComplete={async (p) => {
            setProfile(p);
            useProgramStore.getState().setProfile(p);
            if (p.firstName) setUserName(p.firstName);
            useProgramStore.getState().setUserData(p.firstName || '', userEmail || auth.currentUser?.email || '');
            const prog = generateProgram(p);
            useProgramStore.getState().setProgram(prog);
            setScreen('generating');
          }}
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
            // Nouveau compte : pas de profil encore → quiz, pas l'écran d'attente infini
            setHasProfile(false);
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
            const store = useProgramStore.getState();
            // Si le store local a déjà profil+programme, débloque immédiatement
            if (store.profile && store.program) {
              setHasProfile(true);
            }
            // sinon hasProfile reste null → le useEffect timeout le débloque en 2s
            setAuthed(true);
          }}
        />
      );

    // Fallback : retour au splash
    return (
      <SplashScreen
        onStart={() => setScreen('quiz')}
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
