import { Handler } from '@netlify/functions';

/** Netlify env vars may include stray quotes or whitespace. */
function sanitizeApiKey(raw: string): string {
  let key = (raw || '').trim();
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

function extractGeminiText(data: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
}): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) return '';
  const answer = parts
    .filter((p) => p.text && p.thought !== true)
    .map((p) => p.text!.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  if (answer) return answer;
  return parts[parts.length - 1]?.text?.trim() || '';
}

// ─── Base de Connaissances Totale Pure Ascension & Coach Expert ─────────────
const SYSTEM_PROMPT = `Tu es le Coach Expert IA de Pure Ascension. Tu maîtrises l'intégralité de l'application, l'entraînement physique et la nutrition.

## Connaissance Totale de l'Application Pure Ascension :
1. **Entraînements & Séances** :
   - Structuration en 4 Phases : P1 Échauffement & Activation (45s repos), P2 Mouvements Polyarticulaires & Force (90s repos, RPE 8-9), P3 Accessoires & Isolation (45s repos), P4 Cooldown & Récupération.
   - Spécialité : Poids du corps / Calisthenics d'Élite (Archer Push-ups, Ring Dips, L-Sit Pull-ups, Dragon Flags, Pistol Squats) et Kettlebell Lourd (Double KB Clean & Press, Turkish Get-Up, Deficit RDL).
   - Tempos Normalisés à 4 chiffres (ex: 3-1-1-0 = 3s descente, 1s pause bas, 1s montée, 0s pause haut).
   - RPE (Effort perçu 1 à 10) : RPE 8 = effort soutenu avec 2 répétitions en réserve.
   - Bouton 1-Tap "Remplacer l'exercice" : Génère une alternative équivalente en cas de matériel indisponible ou fatigue.

2. **Nutrition & Scanner IA** :
   - Calcul des calories sur-mesure (ex: 2 800 kcal) et des macronutriments (Protéines pour la réparation, Glucides pour l'énergie, Lipides pour les hormones).
   - Scanner de Repas IA : Analyse en direct les photos d'assiettes pour détecter les vrais aliments et leurs calories/macros.
   - Liste de Courses Intelligente : Génère automatiquement la liste d'achats triée par rayon.
   - Livre de Recettes : Propose des repas riches en nutriments sans sucres raffinés.

3. **Conseils d'Entraînement sur Demande** :
   - Si l'utilisateur demande une séance (ex: "training de leg", "séance pecs/dos", "full body"), fournis une séance complète structurée en 4 phases avec exercices, séries, répétitions, tempos et RPE cibles.

## Règles de Style :
- Sois motivant, précis, professionnel et direct.
- Rédige en français clair sans jargon inutile.
- Fournis des réponses structurées avec des sous-titres et des listes à puces.`;

// ─── Générateur de Réponses Expert (Fallback Dynamique) ─────────────────────
function getSmartFallbackResponse(query: string, userProfile?: any): string {
  const q = query.toLowerCase();

  // 1. Demande de séance Jambes (Legs)
  if (q.includes('leg') || q.includes('jambe') || q.includes('cuisse') || q.includes('squat')) {
    return `Voici ta séance **Leg Day Élite (4 Phases)** conçue pour la force et le développement des cuisses et fessiers :

### Phase 1 • Échauffement (45s repos)
• **Squat au Poids du Corps Tempo Lent** : 2 séries x 15 reps (Tempo 3-1-1-0, RPE 5)

### Phase 2 • Force Principale (90s repos)
• **Barbell ou Kettlebell Front Squat** : 4 séries x 8 reps (Tempo 3-1-1-0, RPE 8.5)
• **Soulevé de Terre Roumain (RDL)** : 3 séries x 10 reps (Tempo 3-1-1-0, RPE 8)

### Phase 3 • Isolation & Accessoires (45s repos)
• **Squat Bulgare Fente Arrière** : 3 séries x 10 reps par jambe (Tempo 2-1-1-0, RPE 8)
• **Leg Curl ou Hip Thrust** : 3 séries x 12 reps (Tempo 2-1-2-0, RPE 8)

### Phase 4 • Cooldown (30s repos)
• **Étirements Myofasciaux Fessiers & Ischios** : 2 min (Pression douce)

💡 *Conseil Coach* : Concentre-toi sur le tempo de 3 secondes à la descente pour stimuler les fibres musculaires en toute sécurité.`;
  }

  // 2. Demande de séance Poussée / Haut du corps
  if (q.includes('pec') || q.includes('push') || q.includes('bras') || q.includes('épaule') || q.includes('triceps')) {
    return `Voici ta séance **Poussée & Haut du Corps (4 Phases)** :

### Phase 1 • Activation (45s repos)
• **Rotations d'Épaules & Pommes de Mains au Sol** : 2 séries x 12 reps

### Phase 2 • Force Principale (90s repos)
• **Développé Couché aux Haltères ou Dips Lestés** : 4 séries x 8 reps (Tempo 3-1-1-0, RPE 8.5)
• **Archer Push-ups ou Pommes Déclinées** : 3 séries x 8 reps par côté (Tempo 3-1-1-0, RPE 8)

### Phase 3 • Isolation (45s repos)
• **Élévations Latérales aux Haltères** : 3 séries x 12 reps (Tempo 2-1-1-0, RPE 8)
• **Extensions Triceps à la Poulie ou au Poids du Corps** : 3 séries x 12 reps (Tempo 2-1-2-0, RPE 8)

### Phase 4 • Cooldown (30s repos)
• **Ouverture Thoracique & Récupération** : 2 min de respiration profonde.`;
  }

  // 3. Question sur l'application / scanner / nutrition
  if (q.includes('scanner') || q.includes('photo') || q.includes('repas') || q.includes('manger') || q.includes('calorie')) {
    return `Dans l'application **Pure Ascension**, la nutrition est pensée pour être simple et sans prise de tête :

1. **Scanner de Repas IA** : Clique sur l'icône appareil photo dans l'onglet Repas, prends ton assiette en photo et l'IA identifie automatiquement tes aliments et calcule tes protéines, glucides et lipides.
2. **Objectif Calorique** : Ton quota (ex: 2 800 kcal) est calculé pour nourrir tes muscles sans stocker de graisse.
3. **Liste de Courses** : Clique sur "Liste de Courses" pour obtenir ta checklist d'aliments sains triée par rayon.

Besoin d'un conseil spécifique sur tes repas du jour ? Pose-moi ta question !`;
  }

  // 4. Réponse générale d'accompagnement
  return `Je suis ton Coach IA Pure Ascension. Je peux t'aider sur :

1. **Générer des séances sur-mesure** (Jambes, Haut du corps, Calisthenics, Kettlebell, Cardio).
2. **Expliquer les exercices & les règles** (Tempos 3-1-1-0, RPE 8, les 4 Phases P1-P4).
3. **Optimiser ta nutrition** (Scanner de repas IA, objectifs caloriques, choix des aliments).

Quelle est ta priorité pour ta prochaine séance ou ton prochain repas ?`;
}

// ─── Handler Principal ───────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  try {
    const { messages, userProfile, uid } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Le champ "messages" est requis.' }) };
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // Appel à l'API Gemini si disponible
    const GEMINI_API_KEY = sanitizeApiKey(process.env.GEMINI_API_KEY || '');

    if (GEMINI_API_KEY) {
      let userContext = '';
      if (userProfile) {
        userContext = `\n\n## Profil Utilisateur :
- Objectif : ${userProfile.mainGoal || 'général'}
- Expérience : ${userProfile.experience || 'intermédiaire'}`;
      }

      const systemInstruction = SYSTEM_PROMPT + userContext;
      // Gemini exige une alternance user/model et un premier message "user"
      const geminiMessages = messages
        .filter((msg: { role: string; content: string }) => !!msg?.content?.trim())
        .map((msg: { role: string; content: string }) => ({
          role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(msg.content) }],
        }));

      if (geminiMessages.length > 0 && geminiMessages[0].role !== 'user') {
        geminiMessages.unshift({
          role: 'user',
          parts: [{ text: 'Bonjour Coach.' }],
        });
      }

      const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'] as const;

      try {
        for (const model of models) {
          const generationConfig: Record<string, unknown> = {
            temperature: 0.7,
            maxOutputTokens: 1200,
          };
          if (model.includes('2.5')) {
            generationConfig.thinkingConfig = { thinkingBudget: 0 };
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY,
              },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemInstruction }] },
                contents: geminiMessages,
                generationConfig,
              }),
            }
          );

          if (!response.ok) {
            const errBody = await response.text();
            console.warn(`chat-coach Gemini [${model}] HTTP ${response.status}:`, errBody.slice(0, 300));
            if (response.status === 401 || response.status === 403) break;
            continue;
          }

          const data = await response.json();
          const reply = extractGeminiText(data);
          if (reply) {
            console.log(`chat-coach Gemini succès via ${model}`);
            return { statusCode: 200, headers, body: JSON.stringify({ reply, source: 'gemini' }) };
          }
          console.warn(`chat-coach Gemini [${model}] : réponse vide`);
        }
      } catch (e) {
        console.error('Erreur API Gemini :', e);
      }
    } else {
      console.warn('chat-coach : GEMINI_API_KEY absente ou vide');
    }

    // Réponse intelligente si Gemini est indisponible ou ne renvoie rien
    const fallbackReply = getSmartFallbackResponse(lastUserMessage, userProfile);
    return { statusCode: 200, headers, body: JSON.stringify({ reply: fallbackReply }) };

  } catch (error: any) {
    console.error('Erreur chat-coach :', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: "Je suis ton Coach IA Pure Ascension. Que souhaites-tu savoir sur tes entraînements en 4 phases, ta nutrition ou l'utilisation du scanner de repas ?",
      }),
    };
  }
};
