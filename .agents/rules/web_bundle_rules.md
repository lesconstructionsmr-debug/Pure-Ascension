# Règle d'Intégrité du Build Web & Imports React (Pure Ascension)

1. **Ne Jamais Supprimer `import React from 'react';`** :
   - `App.tsx` et les composants React Native Web utilisent `React.Component`, `React.useState` et `React.useEffect`.
   - L'omission de cet import provoque un crash JS silencieux `ReferenceError: React is not defined` qui laisse l'écran blanc/crème au chargement.

2. **Gabarit HTML Source (`public/index.html`)** :
   - Le fichier `public/index.html` est le gabarit source injecté par Metro Bundler lors de `npx expo export -p web`.
   - Il doit TOUJOURS conserver le style :
     ```html
     html, body, #root, #root > div {
       width: 100%;
       height: 100%;
       min-height: 100vh;
       margin: 0;
       padding: 0;
       display: flex;
       flex-direction: column;
       flex: 1;
       background-color: #FBF8F3;
     }
     ```
   - Cela empêche le conteneur React Native Web d'avoir une hauteur de 0px ou d'afficher un fond vert effondré.
