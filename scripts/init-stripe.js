/**
 * Script d'initialisation Stripe
 * Crée les produits et prix pour Pure Ascension Standard et Premium.
 * Usage: node scripts/init-stripe.js <STRIPE_SECRET_KEY>
 */
const Stripe = require('stripe');

const secretKey = process.argv[2] || process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error("Erreur : Clé secrète Stripe manquante.");
  console.log("Usage: node scripts/init-stripe.js sk_test_...");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

async function init() {
  console.log("Initialisation des produits Stripe...");

  try {
    // 1. Produit Standard
    console.log("Création du produit Standard...");
    const productStandard = await stripe.products.create({
      name: "Pure Ascension Standard",
      description: "Accès au programme d'entraînement et nutrition de base.",
    });

    const priceStandard = await stripe.prices.create({
      product: productStandard.id,
      unit_amount: 1200, // 12.00 $
      currency: "cad",   // ou USD selon votre devise par défaut, cad = dollar canadien
      recurring: {
        interval: "month",
      },
    });
    console.log(`✓ Produit Standard créé : ${productStandard.id}`);
    console.log(`✓ Prix Standard créé : ${priceStandard.id} (12.00 $ / mois)`);

    // 2. Produit Premium
    console.log("Création du produit Premium...");
    const productPremium = await stripe.products.create({
      name: "Pure Ascension Premium",
      description: "Accès complet avec ajustements hebdomadaires, plans avancés et livre de recettes.",
    });

    const pricePremium = await stripe.prices.create({
      product: productPremium.id,
      unit_amount: 1999, // 19.99 $
      currency: "cad",
      recurring: {
        interval: "month",
      },
    });
    console.log(`✓ Produit Premium créé : ${productPremium.id}`);
    console.log(`✓ Prix Premium créé : ${pricePremium.id} (19.99 $ / mois)`);

    console.log("\n==================================================");
    console.log("Configuration Stripe terminée avec succès !");
    console.log("Veuillez conserver ces identifiants de prix pour vos variables d'environnement :");
    console.log(`STRIPE_PRICE_STANDARD=${priceStandard.id}`);
    console.log(`STRIPE_PRICE_PREMIUM=${pricePremium.id}`);
    console.log("==================================================");

  } catch (error) {
    console.error("Une erreur est survenue lors de l'initialisation Stripe :", error);
    process.exit(1);
  }
}

init();
