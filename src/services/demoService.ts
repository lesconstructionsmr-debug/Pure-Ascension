import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { generateProgram } from './programService';
import { cleanObject } from './dbService';

export async function setupDemoUser(uid: string) {
  const demoProfile = {
    firstName: "Benoît",
    lastName: "Bêta",
    age: 34,
    gender: "homme",
    weightLb: 195,
    targetLb: 180,
    heightFt: 5,
    heightIn: 10,
    experience: "intermediaire",
    equipment: "gym",
    frequency: 4,
    activityLevel: "actif",
    cardioSport: "course",
    restrictions: ["aucun"],
    digestiveQuizCompleted: true,
    digestiveSymptoms: ["ballonnements", "fatigue"],
    stomachAcid: "hypo",
    motivation: "Retrouver l'énergie de mes 20 ans et courir un semi-marathon.",
    hydrationTarget: 2.5
  };

  const program = generateProgram(demoProfile as any);
  
  // 1. Écrire le profil et débloquer Premium
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, cleanObject({
    profile: demoProfile,
    program,
    goal: 'perte-poids',
    stripe_subscription_status: 'active',
    planLevel: 'premium',
    isPremium: true,
    streakDays: 4,
  }), { merge: true });

  // 2. Générer 30 jours d'historique dans Firestore
  const batch = writeBatch(db);
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    // Date locale (évite le décalage UTC de toISOString)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // Courbe de poids réaliste descendante (de 195 à ~181.5 lb)
    const initialWeight = 195;
    const targetWeight = 181.5;
    const progressFactor = (30 - i) / 30; // 0 (le plus vieux) à 1 (aujourd'hui)
    const noise = Math.sin(i * 1.5) * 0.7; // fluctuations d'eau
    const simulatedWeight = Math.round((initialWeight - (initialWeight - targetWeight) * progressFactor + noise) * 10) / 10;
    
    // Entraînement 4x par semaine
    const dayOfWeek = d.getDay();
    const workoutDone = i === 0
      ? false
      : (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 6);
    
    const progressRef = doc(db, 'users', uid, 'progress', dateStr);
    batch.set(progressRef, {
      date: dateStr,
      weight: simulatedWeight,
      // Aujourd'hui (i===0) : zéro — évite eau/sommeil préremplis au 1er open
      waterGlasses: i === 0 ? 0 : Math.floor(Math.random() * 3) + 6,
      sleepScore: i === 0 ? 0 : undefined,
      workoutDone,
      mealsDone: i === 0 ? [] : ['meal-1', 'meal-2', 'meal-3'],
      mentalCheckin: false,
      updatedAt: new Date()
    }, { merge: true });
  }
  
  await batch.commit();
}
