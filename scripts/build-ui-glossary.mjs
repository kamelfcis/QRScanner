#!/usr/bin/env node
/**
 * Builds scripts/i18n/ui-glossary.json from en.json using embedded FR/NL phrase maps.
 * Run once when en.json changes, then run generate-fr-nl-messages.mjs.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const enPath = join(root, 'src/messages/en.json');
const outDir = join(__dirname, 'i18n');
const outPath = join(outDir, 'ui-glossary.json');

/** @type {Record<string, { fr: string; nl: string }>} */
const PHRASES = {
  'Loading...': { fr: 'Chargement…', nl: 'Laden…' },
  'Saving...': { fr: 'Enregistrement…', nl: 'Opslaan…' },
  Save: { fr: 'Enregistrer', nl: 'Opslaan' },
  'Save Changes': { fr: 'Enregistrer les modifications', nl: 'Wijzigingen opslaan' },
  Cancel: { fr: 'Annuler', nl: 'Annuleren' },
  Delete: { fr: 'Supprimer', nl: 'Verwijderen' },
  Edit: { fr: 'Modifier', nl: 'Bewerken' },
  Create: { fr: 'Créer', nl: 'Aanmaken' },
  Add: { fr: 'Ajouter', nl: 'Toevoegen' },
  Search: { fr: 'Rechercher', nl: 'Zoeken' },
  Back: { fr: 'Retour', nl: 'Terug' },
  Confirm: { fr: 'Confirmer', nl: 'Bevestigen' },
  Yes: { fr: 'Oui', nl: 'Ja' },
  No: { fr: 'Non', nl: 'Nee' },
  Close: { fr: 'Fermer', nl: 'Sluiten' },
  Actions: { fr: 'Actions', nl: 'Acties' },
  Active: { fr: 'Actif', nl: 'Actief' },
  Inactive: { fr: 'Inactif', nl: 'Inactief' },
  Visible: { fr: 'Visible', nl: 'Zichtbaar' },
  Hidden: { fr: 'Masqué', nl: 'Verborgen' },
  All: { fr: 'Tout', nl: 'Alles' },
  None: { fr: 'Aucun', nl: 'Geen' },
  Error: { fr: 'Erreur', nl: 'Fout' },
  Success: { fr: 'Succès', nl: 'Gelukt' },
  'No results found': { fr: 'Aucun résultat', nl: 'Geen resultaten gevonden' },
  Retry: { fr: 'Réessayer', nl: 'Opnieuw proberen' },
  Optional: { fr: 'Facultatif', nl: 'Optioneel' },
  Required: { fr: 'Obligatoire', nl: 'Verplicht' },
  Update: { fr: 'Mettre à jour', nl: 'Bijwerken' },
  'Processing...': { fr: 'Traitement…', nl: 'Verwerken…' },
  to: { fr: 'à', nl: 'tot' },
  Order: { fr: 'Commande', nl: 'Bestelling' },
  Enabled: { fr: 'Activé', nl: 'Ingeschakeld' },
  Disabled: { fr: 'Désactivé', nl: 'Uitgeschakeld' },
  Upload: { fr: 'Téléverser', nl: 'Uploaden' },
  'Uploading...': { fr: 'Téléversement…', nl: 'Uploaden…' },
  Remove: { fr: 'Retirer', nl: 'Verwijderen' },
  Download: { fr: 'Télécharger', nl: 'Downloaden' },
  Print: { fr: 'Imprimer', nl: 'Afdrukken' },
  Export: { fr: 'Exporter', nl: 'Exporteren' },
  Import: { fr: 'Importer', nl: 'Importeren' },
  Preview: { fr: 'Aperçu', nl: 'Voorbeeld' },
  Duplicate: { fr: 'Dupliquer', nl: 'Dupliceren' },
  'Are you sure?': { fr: 'Êtes-vous sûr ?', nl: 'Weet u het zeker?' },
  'This action cannot be undone.': {
    fr: 'Cette action est irréversible.',
    nl: 'Deze actie kan niet ongedaan worden gemaakt.',
  },
  'No data found': { fr: 'Aucune donnée', nl: 'Geen gegevens gevonden' },
  'There is nothing to display yet.': {
    fr: 'Rien à afficher pour le moment.',
    nl: 'Er is nog niets om weer te geven.',
  },
  'Try Again': { fr: 'Réessayer', nl: 'Opnieuw proberen' },
  'Go home': { fr: "Retour à l'accueil", nl: 'Naar startpagina' },
  'Go back': { fr: 'Retour', nl: 'Ga terug' },
  or: { fr: 'ou', nl: 'of' },
  and: { fr: 'et', nl: 'en' },
  of: { fr: 'sur', nl: 'van' },
  SAR: { fr: 'SAR', nl: 'SAR' },
  Star: { fr: 'Étoile', nl: 'Ster' },
  Stars: { fr: 'Étoiles', nl: 'Sterren' },
  from: { fr: 'de', nl: 'van' },
  Discount: { fr: 'Remise', nl: 'Korting' },
  Home: { fr: 'Accueil', nl: 'Home' },
  Menu: { fr: 'Menu', nl: 'Menu' },
  About: { fr: 'À propos', nl: 'Over ons' },
  Contact: { fr: 'Contact', nl: 'Contact' },
  Dashboard: { fr: 'Tableau de bord', nl: 'Dashboard' },
  Login: { fr: 'Connexion', nl: 'Inloggen' },
  Logout: { fr: 'Déconnexion', nl: 'Uitloggen' },
  Admin: { fr: 'Admin', nl: 'Beheer' },
  Analytics: { fr: 'Analyses', nl: 'Analyses' },
  Reports: { fr: 'Rapports', nl: 'Rapporten' },
  Settings: { fr: 'Paramètres', nl: 'Instellingen' },
  Testimonials: { fr: 'Témoignages', nl: 'Getuigenissen' },
  'QR Codes': { fr: 'Codes QR', nl: 'QR-codes' },
  Tables: { fr: 'Tables', nl: 'Tafels' },
  Products: { fr: 'Produits', nl: 'Producten' },
  Categories: { fr: 'Catégories', nl: 'Categorieën' },
  Gallery: { fr: 'Galerie', nl: 'Galerij' },
  Offers: { fr: 'Offres', nl: 'Aanbiedingen' },
  Insights: { fr: 'Statistiques', nl: 'Inzichten' },
  Heatmaps: { fr: 'Cartes thermiques', nl: 'Heatmaps' },
  'Order Now': { fr: 'Commander', nl: 'Nu bestellen' },
  'View Menu': { fr: 'Voir le menu', nl: 'Menu bekijken' },
  'Our Story': { fr: 'Notre histoire', nl: 'Ons verhaal' },
  'Welcome to': { fr: 'Bienvenue chez', nl: 'Welkom bij' },
  Dining: { fr: 'Sur place', nl: 'Ter plaatse' },
  Takeaway: { fr: 'À emporter', nl: 'Afhalen' },
  Checkout: { fr: 'Paiement', nl: 'Afrekenen' },
  Subtotal: { fr: 'Sous-total', nl: 'Subtotaal' },
  Total: { fr: 'Total', nl: 'Totaal' },
  Quantity: { fr: 'Quantité', nl: 'Aantal' },
  Spicy: { fr: 'Épicé', nl: 'Pittig' },
  Popular: { fr: 'Populaire', nl: 'Populair' },
  New: { fr: 'Nouveau', nl: 'Nieuw' },
  Bestseller: { fr: 'Best-seller', nl: 'Bestseller' },
  Small: { fr: 'Petit', nl: 'Klein' },
  Large: { fr: 'Grand', nl: 'Groot' },
  Phone: { fr: 'Téléphone', nl: 'Telefoon' },
  Email: { fr: 'E-mail', nl: 'E-mail' },
  WhatsApp: { fr: 'WhatsApp', nl: 'WhatsApp' },
  Closed: { fr: 'Fermé', nl: 'Gesloten' },
  Today: { fr: "Aujourd'hui", nl: 'Vandaag' },
  Delivery: { fr: 'Livraison', nl: 'Bezorging' },
  'Dine in': { fr: 'Sur place', nl: 'Ter plaatse' },
  'Dine In': { fr: 'Sur place', nl: 'Ter plaatse' },
  Table: { fr: 'Table', nl: 'Tafel' },
  Name: { fr: 'Nom', nl: 'Naam' },
  Description: { fr: 'Description', nl: 'Beschrijving' },
  Price: { fr: 'Prix', nl: 'Prijs' },
  Available: { fr: 'Disponible', nl: 'Beschikbaar' },
  Unavailable: { fr: 'Indisponible', nl: 'Niet beschikbaar' },
  Featured: { fr: 'En vedette', nl: 'Uitgelicht' },
  Monday: { fr: 'Lundi', nl: 'Maandag' },
  Tuesday: { fr: 'Mardi', nl: 'Dinsdag' },
  Wednesday: { fr: 'Mercredi', nl: 'Woensdag' },
  Thursday: { fr: 'Jeudi', nl: 'Donderdag' },
  Friday: { fr: 'Vendredi', nl: 'Vrijdag' },
  Saturday: { fr: 'Samedi', nl: 'Zaterdag' },
  Sunday: { fr: 'Dimanche', nl: 'Zondag' },
};

/** Word-level replacements applied left-to-right for unmapped strings. */
const WORDS = [
  ['Loading', 'Chargement', 'Laden'],
  ['Saving', 'Enregistrement', 'Opslaan'],
  ['Uploading', 'Téléversement', 'Uploaden'],
  ['Processing', 'Traitement', 'Verwerken'],
  ['Signing in', 'Connexion', 'Inloggen'],
  ['Signing', 'Connexion', 'Inloggen'],
  ['Search', 'Rechercher', 'Zoeken'],
  ['Dashboard', 'Tableau de bord', 'Dashboard'],
  ['Settings', 'Paramètres', 'Instellingen'],
  ['Categories', 'Catégories', 'Categorieën'],
  ['Products', 'Produits', 'Producten'],
  ['Checkout', 'Paiement', 'Afrekenen'],
  ['Restaurant', 'Restaurant', 'Restaurant'],
  ['Order', 'Commande', 'Bestelling'],
  ['Menu', 'Menu', 'Menu'],
  ['Gallery', 'Galerie', 'Galerij'],
  ['Analytics', 'Analyses', 'Analyses'],
  ['Reports', 'Rapports', 'Rapporten'],
  ['Testimonials', 'Témoignages', 'Getuigenissen'],
  ['Password', 'Mot de passe', 'Wachtwoord'],
  ['Email', 'E-mail', 'E-mail'],
  ['Phone', 'Téléphone', 'Telefoon'],
  ['Address', 'Adresse', 'Adres'],
  ['Delivery', 'Livraison', 'Bezorging'],
  ['Pickup', 'Retrait', 'Afhalen'],
  ['Takeaway', 'À emporter', 'Afhalen'],
  ['Dining', 'Sur place', 'Ter plaatse'],
  ['Table', 'Table', 'Tafel'],
  ['Customer', 'Client', 'Klant'],
  ['Active', 'Actif', 'Actief'],
  ['Inactive', 'Inactif', 'Inactief'],
  ['Visible', 'Visible', 'Zichtbaar'],
  ['Hidden', 'Masqué', 'Verborgen'],
  ['Featured', 'En vedette', 'Uitgelicht'],
  ['Available', 'Disponible', 'Beschikbaar'],
  ['Unavailable', 'Indisponible', 'Niet beschikbaar'],
  ['English', 'anglais', 'Engels'],
  ['Arabic', 'arabe', 'Arabisch'],
  ['French', 'français', 'Frans'],
  ['Dutch', 'néerlandais', 'Nederlands'],
  ['Optional', 'Facultatif', 'Optioneel'],
  ['Required', 'Obligatoire', 'Verplicht'],
  ['Delete', 'Supprimer', 'Verwijderen'],
  ['Edit', 'Modifier', 'Bewerken'],
  ['Add', 'Ajouter', 'Toevoegen'],
  ['Remove', 'Retirer', 'Verwijderen'],
  ['Upload', 'Téléverser', 'Uploaden'],
  ['Download', 'Télécharger', 'Downloaden'],
  ['Export', 'Exporter', 'Exporteren'],
  ['Import', 'Importer', 'Importeren'],
  ['Preview', 'Aperçu', 'Voorbeeld'],
  ['Generate', 'Générer', 'Genereren'],
  ['Confirm', 'Confirmer', 'Bevestigen'],
  ['Cancel', 'Annuler', 'Annuleren'],
  ['Save', 'Enregistrer', 'Opslaan'],
  ['Close', 'Fermer', 'Sluiten'],
  ['Open', 'Ouvrir', 'Openen'],
  ['Install', 'Installer', 'Installeren'],
  ['Offline', 'Hors ligne', 'Offline'],
  ['Online', 'En ligne', 'Online'],
  ['Error', 'Erreur', 'Fout'],
  ['Success', 'Succès', 'Gelukt'],
  ['Total', 'Total', 'Totaal'],
  ['Subtotal', 'Sous-total', 'Subtotaal'],
  ['Tax', 'TVA', 'BTW'],
  ['Service', 'Service', 'Service'],
  ['Quantity', 'Quantité', 'Aantal'],
  ['Notes', 'Notes', 'Notities'],
  ['Image', 'Image', 'Afbeelding'],
  ['Logo', 'Logo', 'Logo'],
  ['Theme', 'Thème', 'Thema'],
  ['Color', 'Couleur', 'Kleur'],
  ['Primary', 'Primaire', 'Primair'],
  ['Secondary', 'Secondaire', 'Secundair'],
  ['Accent', 'Accent', 'Accent'],
  ['Background', 'Arrière-plan', 'Achtergrond'],
  ['Currency', 'Devise', 'Valuta'],
  ['Minimum', 'Minimum', 'Minimum'],
  ['Maximum', 'Maximum', 'Maximum'],
  ['minutes', 'minutes', 'minuten'],
  ['minute', 'minute', 'minuut'],
  ['hour', 'heure', 'uur'],
  ['day', 'jour', 'dag'],
  ['week', 'semaine', 'week'],
  ['month', 'mois', 'maand'],
  ['year', 'année', 'jaar'],
  ['Visitors', 'Visiteurs', 'Bezoekers'],
  ['Scans', 'Scans', 'Scans'],
  ['Devices', 'Appareils', 'Apparaten'],
  ['Overview', 'Aperçu', 'Overzicht'],
  ['Welcome', 'Bienvenue', 'Welkom'],
  ['Story', 'Histoire', 'Verhaal'],
  ['Contact', 'Contact', 'Contact'],
  ['Location', 'Emplacement', 'Locatie'],
  ['Opening Hours', 'Heures d\'ouverture', 'Openingstijden'],
  ['Follow', 'Suivre', 'Volgen'],
  ['Facebook', 'Facebook', 'Facebook'],
  ['Instagram', 'Instagram', 'Instagram'],
  ['TikTok', 'TikTok', 'TikTok'],
  ['Cart', 'Panier', 'Winkelwagen'],
  ['Favorites', 'Favoris', 'Favorieten'],
  ['Recommended', 'Recommandé', 'Aanbevolen'],
  ['Recently Viewed', 'Récemment consultés', 'Recent bekeken'],
  ['Special Offers', 'Offres spéciales', 'Speciale aanbiedingen'],
  ['Signature Dishes', 'Plats signature', 'Signatuurgerechten'],
  ['View Full Menu', 'Voir le menu complet', 'Volledige menu bekijken'],
];

// Fix the broken entry above - I'll use a cleaner approach in translateHeuristic

function translateHeuristic(en) {
  let fr = en;
  let nl = en;
  for (const [enWord, frWord, nlWord] of WORDS) {
    if (enWord.includes("'")) continue;
    const re = new RegExp(`\\b${enWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    fr = fr.replace(re, frWord);
    nl = nl.replace(re, nlWord);
  }
  return { fr, nl };
}

function translateString(en) {
  if (PHRASES[en]) return PHRASES[en];

  // Preserve ICU placeholders like {name}, {count}
  const placeholders = [];
  let idx = 0;
  const stripped = en.replace(/\{[^}]+\}/g, (m) => {
    const token = `__PH${idx}__`;
    placeholders.push({ token, value: m });
    idx += 1;
    return token;
  });

  const exact = PHRASES[stripped];
  if (exact) {
    let { fr, nl } = exact;
    for (const { token, value } of placeholders) {
      fr = fr.replaceAll(token, value);
      nl = nl.replaceAll(token, value);
    }
    return { fr, nl };
  }

  // Namespace-specific full-string maps from en.json (priority namespaces)
  const curated = CURATED[en];
  if (curated) return curated;

  const heuristic = translateHeuristic(en);
  return heuristic;
}

/** Full-string curated translations for high-visibility UI. */
const CURATED = {
  'Warda Shamya': { fr: 'Warda Shamya', nl: 'Warda Shamya' },
  'A culinary journey through Lebanese & Syrian traditions': {
    fr: 'Un voyage culinaire à travers les traditions libanaises et syriennes',
    nl: 'Een culinaire reis door Libanese en Syrische tradities',
  },
  'View Menu': { fr: 'Voir le menu', nl: 'Menu bekijken' },
  'Signature Dishes': { fr: 'Plats signature', nl: 'Signatuurgerechten' },
  'A taste of our most loved Levantine classics — scan, browse, and order.': {
    fr: 'Un avant-goût de nos classiques levantins préférés — scannez, parcourez et commandez.',
    nl: 'Een proeverij van onze geliefde Levantijnse klassiekers — scan, blader en bestel.',
  },
  'No featured dishes available yet.': {
    fr: 'Aucun plat vedette disponible pour le moment.',
    nl: 'Nog geen uitgelichte gerechten beschikbaar.',
  },
  'View Full Menu': { fr: 'Voir le menu complet', nl: 'Volledig menu bekijken' },
  'A Taste of Excellence': { fr: 'Un goût d\'excellence', nl: 'Een smaak van excellentie' },
  'Visit Us': { fr: 'Nous rendre visite', nl: 'Bezoek ons' },
  'Opening Hours': { fr: 'Heures d\'ouverture', nl: 'Openingstijden' },
  'Contact Us': { fr: 'Contactez-nous', nl: 'Neem contact op' },
  "We'd love to hear from you": {
    fr: 'Nous serions ravis de vous entendre',
    nl: 'We horen graag van u',
  },
  'Reach us by phone, WhatsApp, or email.': {
    fr: 'Contactez-nous par téléphone, WhatsApp ou e-mail.',
    nl: 'Bereik ons via telefoon, WhatsApp of e-mail.',
  },
  'Contact details will appear here once configured in settings.': {
    fr: 'Les coordonnées apparaîtront ici une fois configurées dans les paramètres.',
    nl: 'Contactgegevens verschijnen hier zodra ze in de instellingen zijn geconfigureerd.',
  },
  'Get in Touch': { fr: 'Contactez-nous', nl: 'Neem contact op' },
  'Our Location': { fr: 'Notre emplacement', nl: 'Onze locatie' },
  'Restaurant location map': { fr: 'Carte de localisation du restaurant', nl: 'Locatiekaart restaurant' },
  'View on Map': { fr: 'Voir sur la carte', nl: 'Bekijk op kaart' },
  Egypt: { fr: 'Égypte', nl: 'Egypte' },
  'Follow Us': { fr: 'Suivez-nous', nl: 'Volg ons' },
  'Social links coming soon.': { fr: 'Liens sociaux bientôt disponibles.', nl: 'Social links binnenkort beschikbaar.' },
  '© {year} Warda Shamya. All rights reserved.': {
    fr: '© {year} Warda Shamya. Tous droits réservés.',
    nl: '© {year} Warda Shamya. Alle rechten voorbehouden.',
  },
  'Premium dining experience celebrating Lebanese and Syrian culinary traditions.': {
    fr: 'Expérience gastronomique premium célébrant les traditions culinaires libanaises et syriennes.',
    nl: 'Premium dinerervaring ter ere van Libanese en Syrische culinaire tradities.',
  },
  'Quick Links': { fr: 'Liens rapides', nl: 'Snelle links' },
  'Contact Info': { fr: 'Coordonnées', nl: 'Contactgegevens' },
  'Hero carousel': { fr: 'Carrousel héro', nl: 'Hero-carrousel' },
  'Previous slide': { fr: 'Diapositive précédente', nl: 'Vorige dia' },
  'Next slide': { fr: 'Diapositive suivante', nl: 'Volgende dia' },
  'Carousel slides': { fr: 'Diapositives du carrousel', nl: 'Carrouseldia\'s' },
  'Go to slide {number}': { fr: 'Aller à la diapositive {number}', nl: 'Ga naar dia {number}' },
  'Slide {number}': { fr: 'Diapositive {number}', nl: 'Dia {number}' },
  'Special Offers': { fr: 'Offres spéciales', nl: 'Speciale aanbiedingen' },
  'What Our Guests Say': { fr: 'Ce que disent nos clients', nl: 'Wat onze gasten zeggen' },
  'Go to testimonial {number}': { fr: 'Aller au témoignage {number}', nl: 'Ga naar getuigenis {number}' },
  'Gallery coming soon.': { fr: 'Galerie bientôt disponible.', nl: 'Galerij binnenkort beschikbaar.' },
  'View Gallery': { fr: 'Voir la galerie', nl: 'Galerij bekijken' },
  'Chat on WhatsApp': { fr: 'Discuter sur WhatsApp', nl: 'Chat via WhatsApp' },
  'Our Menu': { fr: 'Notre menu', nl: 'Ons menu' },
  'No products available in this category': {
    fr: 'Aucun produit disponible dans cette catégorie',
    nl: 'Geen producten beschikbaar in deze categorie',
  },
  'Search menu...': { fr: 'Rechercher dans le menu…', nl: 'Menu doorzoeken…' },
  'Search menu': { fr: 'Rechercher dans le menu', nl: 'Menu doorzoeken' },
  'Search menu items': { fr: 'Rechercher des plats', nl: 'Menu-items zoeken' },
  'Close search': { fr: 'Fermer la recherche', nl: 'Zoeken sluiten' },
  'Recently Viewed': { fr: 'Récemment consultés', nl: 'Recent bekeken' },
  'Recommended for You': { fr: 'Recommandé pour vous', nl: 'Aanbevolen voor u' },
  'Scan QR Code': { fr: 'Scanner le code QR', nl: 'QR-code scannen' },
  'Table {number}': { fr: 'Table {number}', nl: 'Tafel {number}' },
  Clear: { fr: 'Effacer', nl: 'Wissen' },
  'No results found for "{query}"': {
    fr: 'Aucun résultat pour « {query} »',
    nl: 'Geen resultaten voor "{query}"',
  },
  'Recent Searches': { fr: 'Recherches récentes', nl: 'Recente zoekopdrachten' },
  'Currently unavailable': { fr: 'Actuellement indisponible', nl: 'Momenteel niet beschikbaar' },
  'Menu categories': { fr: 'Catégories du menu', nl: 'Menucategorieën' },
  'Scroll categories backward': { fr: 'Faire défiler les catégories vers l\'arrière', nl: 'Categorieën naar achteren scrollen' },
  'Scroll categories forward': { fr: 'Faire défiler les catégories vers l\'avant', nl: 'Categorieën naar voren scrollen' },
  'Dining mode': { fr: 'Mode sur place', nl: 'Modus ter plaatse' },
  'Close lightbox': { fr: 'Fermer la lightbox', nl: 'Lightbox sluiten' },
  'Zoom in': { fr: 'Zoom avant', nl: 'Inzoomen' },
  'Zoom out': { fr: 'Zoom arrière', nl: 'Uitzoomen' },
  'Menu coming soon': { fr: 'Menu bientôt disponible', nl: 'Menu binnenkort beschikbaar' },
  'We are preparing our delicious menu for you.': {
    fr: 'Nous préparons notre délicieux menu pour vous.',
    nl: 'We bereiden ons heerlijke menu voor u voor.',
  },
  'Add to favorites': { fr: 'Ajouter aux favoris', nl: 'Toevoegen aan favorieten' },
  'Remove from favorites': { fr: 'Retirer des favoris', nl: 'Verwijderen uit favorieten' },
  'Favorites, {count} items': { fr: 'Favoris, {count} articles', nl: 'Favorieten, {count} items' },
  'Call waiter via WhatsApp': { fr: 'Appeler le serveur via WhatsApp', nl: 'Ober bellen via WhatsApp' },
  'Order via WhatsApp': { fr: 'Commander via WhatsApp', nl: 'Bestellen via WhatsApp' },
  'Authentic Levantine flavor, in a modern experience': {
    fr: 'Saveur levantine authentique, dans une expérience moderne',
    nl: 'Authentieke Levantijnse smaken in een moderne ervaring',
  },
  'Signature dishes at {name}': { fr: 'Plats signature chez {name}', nl: 'Signatuurgerechten bij {name}' },
  'Dish details': { fr: 'Détails du plat', nl: 'Gerecht details' },
  'Close details': { fr: 'Fermer les détails', nl: 'Details sluiten' },
  'View dish': { fr: 'Voir le plat', nl: 'Gerecht bekijken' },
  'Try a different dish name, or browse the categories above.': {
    fr: 'Essayez un autre nom de plat ou parcourez les catégories ci-dessus.',
    nl: 'Probeer een andere gerechtnaam of blader door de categorieën hierboven.',
  },
  'Search by dish name in Arabic or English.': {
    fr: 'Rechercher par nom de plat en arabe ou en anglais.',
    nl: 'Zoek op gerechtnaam in Arabisch of Engels.',
  },
  'Nothing is being served in this section right now.': {
    fr: 'Rien n\'est servi dans cette section pour le moment.',
    nl: 'Er wordt momenteel niets geserveerd in deze sectie.',
  },
  'Select size': { fr: 'Choisir la taille', nl: 'Maat kiezen' },
  'From {price}': { fr: 'À partir de {price}', nl: 'Vanaf {price}' },
  'Your Cart': { fr: 'Votre panier', nl: 'Uw winkelwagen' },
  'Your cart is empty': { fr: 'Votre panier est vide', nl: 'Uw winkelwagen is leeg' },
  'Browse the menu and add dishes to get started.': {
    fr: 'Parcourez le menu et ajoutez des plats pour commencer.',
    nl: 'Blader door het menu en voeg gerechten toe om te beginnen.',
  },
  'Add to cart': { fr: 'Ajouter au panier', nl: 'In winkelwagen' },
  'Increase quantity': { fr: 'Augmenter la quantité', nl: 'Aantal verhogen' },
  'Decrease quantity': { fr: 'Diminuer la quantité', nl: 'Aantal verlagen' },
  'Remove item': { fr: 'Retirer l\'article', nl: 'Item verwijderen' },
  'Item notes': { fr: 'Notes sur l\'article', nl: 'Itemnotities' },
  'e.g. Extra garlic, no onions': {
    fr: 'p. ex. ail supplémentaire, sans oignons',
    nl: 'bijv. extra knoflook, geen ui',
  },
  'Edit notes': { fr: 'Modifier les notes', nl: 'Notities bewerken' },
  'Open cart': { fr: 'Ouvrir le panier', nl: 'Winkelwagen openen' },
  'Cart, {count} items': { fr: 'Panier, {count} articles', nl: 'Winkelwagen, {count} items' },
  'Added to cart': { fr: 'Ajouté au panier', nl: 'Toegevoegd aan winkelwagen' },
  'Browse menu': { fr: 'Parcourir le menu', nl: 'Menu bekijken' },
  'View order': { fr: 'Voir la commande', nl: 'Bestelling bekijken' },
  '{count} items in your order': { fr: '{count} articles dans votre commande', nl: '{count} items in uw bestelling' },
  'Order summary': { fr: 'Récapitulatif de commande', nl: 'Besteloverzicht' },
  'Order type': { fr: 'Type de commande', nl: 'Besteltype' },
  Fulfillment: { fr: 'Mode de livraison', nl: 'Afhandeling' },
  'Pickup at restaurant': { fr: 'Retrait au restaurant', nl: 'Afhalen bij restaurant' },
  'Delivery address': { fr: 'Adresse de livraison', nl: 'Bezorgadres' },
  'Street, district, city, nearby landmark…': {
    fr: 'Rue, quartier, ville, point de repère…',
    nl: 'Straat, wijk, stad, herkenningspunt…',
  },
  'Please enter your full delivery address.': {
    fr: 'Veuillez saisir votre adresse de livraison complète.',
    nl: 'Voer uw volledige bezorgadres in.',
  },
  'Your name': { fr: 'Votre nom', nl: 'Uw naam' },
  'Full name': { fr: 'Nom complet', nl: 'Volledige naam' },
  'Phone (optional)': { fr: 'Téléphone (facultatif)', nl: 'Telefoon (optioneel)' },
  'WhatsApp or mobile number': { fr: 'Numéro WhatsApp ou mobile', nl: 'WhatsApp- of mobiel nummer' },
  'Order notes': { fr: 'Notes de commande', nl: 'Bestelnotities' },
  'Any special requests for the kitchen': {
    fr: 'Demandes spéciales pour la cuisine',
    nl: 'Speciale verzoeken voor de keuken',
  },
  'Tax ({rate}%)': { fr: 'TVA ({rate}%)', nl: 'BTW ({rate}%)' },
  'Service ({rate}%)': { fr: 'Service ({rate}%)', nl: 'Service ({rate}%)' },
  'Estimated prep time: ~{minutes} min': {
    fr: 'Temps de préparation estimé : ~{minutes} min',
    nl: 'Geschatte bereidingstijd: ~{minutes} min',
  },
  'Confirm & send via WhatsApp': { fr: 'Confirmer et envoyer via WhatsApp', nl: 'Bevestigen en versturen via WhatsApp' },
  'Opening WhatsApp...': { fr: 'Ouverture de WhatsApp…', nl: 'WhatsApp openen…' },
  'WhatsApp ordering is not configured. Please contact the restaurant.': {
    fr: 'La commande WhatsApp n\'est pas configurée. Veuillez contacter le restaurant.',
    nl: 'WhatsApp-bestellen is niet geconfigureerd. Neem contact op met het restaurant.',
  },
  'Your cart is empty. Add items before checkout.': {
    fr: 'Votre panier est vide. Ajoutez des articles avant de payer.',
    nl: 'Uw winkelwagen is leeg. Voeg items toe vóór het afrekenen.',
  },
  'Please enter your name.': { fr: 'Veuillez saisir votre nom.', nl: 'Voer uw naam in.' },
  'Minimum order is {amount} {currency}.': {
    fr: 'Commande minimum : {amount} {currency}.',
    nl: 'Minimumbestelling is {amount} {currency}.',
  },
  'Notes must be at most {max} characters.': {
    fr: 'Les notes doivent contenir au maximum {max} caractères.',
    nl: 'Notities mogen maximaal {max} tekens bevatten.',
  },
  'Back to menu': { fr: 'Retour au menu', nl: 'Terug naar menu' },
  'Back to cart': { fr: 'Retour au panier', nl: 'Terug naar winkelwagen' },
  'Admin Dashboard': { fr: 'Tableau de bord admin', nl: 'Beheerdersdashboard' },
  "Today's Scans": { fr: "Scans d'aujourd'hui", nl: 'Scans vandaag' },
  "Today's Visitors": { fr: "Visiteurs d'aujourd'hui", nl: 'Bezoekers vandaag' },
  'Active Users': { fr: 'Utilisateurs actifs', nl: 'Actieve gebruikers' },
  'Dining %': { fr: 'Sur place %', nl: 'Ter plaatse %' },
  'Takeaway %': { fr: 'À emporter %', nl: 'Afhalen %' },
  'Total Products': { fr: 'Total produits', nl: 'Totaal producten' },
  'Total Categories': { fr: 'Total catégories', nl: 'Totaal categorieën' },
  'Active Offers': { fr: 'Offres actives', nl: 'Actieve aanbiedingen' },
  'Gallery Images': { fr: 'Images galerie', nl: 'Galerijafbeeldingen' },
  "Today's Activity": { fr: "Activité d'aujourd'hui", nl: 'Activiteit vandaag' },
  'Visitors over time today': { fr: "Visiteurs au fil de la journée", nl: 'Bezoekers vandaag in de loop van de tijd' },
  'Dining vs Takeaway': { fr: 'Sur place vs à emporter', nl: 'Ter plaatse vs afhalen' },
  "Today's order breakdown": { fr: "Répartition des commandes d'aujourd'hui", nl: 'Besteloverzicht vandaag' },
  'Recent Activity': { fr: 'Activité récente', nl: 'Recente activiteit' },
  'No recent activity': { fr: 'Aucune activité récente', nl: 'Geen recente activiteit' },
  Notifications: { fr: 'Notifications', nl: 'Meldingen' },
  'No notifications': { fr: 'Aucune notification', nl: 'Geen meldingen' },
  'Mark all read': { fr: 'Tout marquer comme lu', nl: 'Alles als gelezen markeren' },
  'Mark as read': { fr: 'Marquer comme lu', nl: 'Als gelezen markeren' },
  'More metrics': { fr: 'Plus de métriques', nl: 'Meer statistieken' },
  'Inventory & content': { fr: 'Inventaire et contenu', nl: 'Voorraad en content' },
  'Switch to light mode': { fr: 'Passer en mode clair', nl: 'Naar lichte modus' },
  'Switch to dark mode': { fr: 'Passer en mode sombre', nl: 'Naar donkere modus' },
  'Menu Management': { fr: 'Gestion du menu', nl: 'Menubeheer' },
  'Organize your menu with categories and products.': {
    fr: 'Organisez votre menu avec des catégories et des produits.',
    nl: 'Organiseer uw menu met categorieën en producten.',
  },
  'Manage menu categories and their order.': {
    fr: 'Gérez les catégories du menu et leur ordre.',
    nl: 'Beheer menucategorieën en hun volgorde.',
  },
  'Manage menu products, prices, and availability.': {
    fr: 'Gérez les produits, prix et disponibilité du menu.',
    nl: 'Beheer menuproducten, prijzen en beschikbaarheid.',
  },
  'Configure your restaurant details.': {
    fr: 'Configurez les détails de votre restaurant.',
    nl: 'Configureer uw restaurantgegevens.',
  },
  General: { fr: 'Général', nl: 'Algemeen' },
  Hero: { fr: 'Bannière', nl: 'Hero' },
  Hours: { fr: 'Horaires', nl: 'Openingstijden' },
  Business: { fr: 'Entreprise', nl: 'Bedrijf' },
  Account: { fr: 'Compte', nl: 'Account' },
  'Restaurant Information': { fr: 'Informations du restaurant', nl: 'Restaurantinformatie' },
  'Basic information about your restaurant.': {
    fr: 'Informations de base sur votre restaurant.',
    nl: 'Basisinformatie over uw restaurant.',
  },
  'Restaurant logo': { fr: 'Logo du restaurant', nl: 'Restaurantlogo' },
  'Remove logo': { fr: 'Retirer le logo', nl: 'Logo verwijderen' },
  'Change Logo': { fr: 'Changer le logo', nl: 'Logo wijzigen' },
  'Name (English)': { fr: 'Nom (anglais)', nl: 'Naam (Engels)' },
  'Name (Arabic)': { fr: 'Nom (arabe)', nl: 'Naam (Arabisch)' },
  Tagline: { fr: 'Slogan', nl: 'Tagline' },
  'e.g. A culinary journey through traditions': {
    fr: 'p. ex. Un voyage culinaire à travers les traditions',
    nl: 'bijv. Een culinaire reis door tradities',
  },
  'restaurant@example.com': { fr: 'restaurant@example.com', nl: 'restaurant@example.com' },
  'Hero Section': { fr: 'Section héro', nl: 'Hero-sectie' },
  'Customize the headline, subtitle, and background image on the landing page.': {
    fr: 'Personnalisez le titre, le sous-titre et l\'image de fond de la page d\'accueil.',
    nl: 'Pas kop, ondertitel en achtergrondafbeelding op de landingspagina aan.',
  },
  'Sign in to the admin dashboard': {
    fr: 'Connectez-vous au tableau de bord admin',
    nl: 'Log in op het beheerdersdashboard',
  },
  'Page not found': { fr: 'Page introuvable', nl: 'Pagina niet gevonden' },
  'The page you are looking for does not exist.': {
    fr: 'La page que vous recherchez n\'existe pas.',
    nl: 'De pagina die u zoekt bestaat niet.',
  },
  'Something went wrong': { fr: 'Une erreur s\'est produite', nl: 'Er is iets misgegaan' },
  'An unexpected error occurred.': { fr: 'Une erreur inattendue s\'est produite.', nl: 'Er is een onverwachte fout opgetreden.' },
  'You are offline': { fr: 'Vous êtes hors ligne', nl: 'U bent offline' },
  'Please check your internet connection and try again.': {
    fr: 'Vérifiez votre connexion Internet et réessayez.',
    nl: 'Controleer uw internetverbinding en probeer opnieuw.',
  },
  'Go back home': { fr: "Retour à l'accueil", nl: 'Terug naar home' },
  'Install {name}': { fr: 'Installer {name}', nl: '{name} installeren' },
  'Add to your home screen for quick access to our menu.': {
    fr: 'Ajoutez à votre écran d\'accueil pour un accès rapide à notre menu.',
    nl: 'Voeg toe aan uw startscherm voor snelle toegang tot ons menu.',
  },
  'Not now': { fr: 'Pas maintenant', nl: 'Niet nu' },
  'Dismiss install prompt': { fr: 'Ignorer l\'invite d\'installation', nl: 'Installatieprompt sluiten' },
  'Skip to main content': { fr: 'Aller au contenu principal', nl: 'Ga naar hoofdinhoud' },
  'Open menu': { fr: 'Ouvrir le menu', nl: 'Menu openen' },
  'Close menu': { fr: 'Fermer le menu', nl: 'Menu sluiten' },
  'Toggle theme': { fr: 'Changer de thème', nl: 'Thema wisselen' },
  'Switch language': { fr: 'Changer de langue', nl: 'Taal wisselen' },
  Loading: { fr: 'Chargement', nl: 'Laden' },
  'This field is required': { fr: 'Ce champ est obligatoire', nl: 'Dit veld is verplicht' },
  'Please enter a valid email address': {
    fr: 'Veuillez saisir une adresse e-mail valide',
    nl: 'Voer een geldig e-mailadres in',
  },
  'Must be at least {min} characters': {
    fr: 'Doit contenir au moins {min} caractères',
    nl: 'Moet minimaal {min} tekens bevatten',
  },
  'Must be at most {max} characters': {
    fr: 'Doit contenir au maximum {max} caractères',
    nl: 'Mag maximaal {max} tekens bevatten',
  },
  'Must be a number': { fr: 'Doit être un nombre', nl: 'Moet een getal zijn' },
  'Must be a positive number': { fr: 'Doit être un nombre positif', nl: 'Moet een positief getal zijn' },
  'Welcome to {name}': { fr: 'Bienvenue chez {name}', nl: 'Welkom bij {name}' },
  'Please choose your order type': {
    fr: 'Veuillez choisir votre type de commande',
    nl: 'Kies uw besteltype',
  },
  'Welcome to Warda Shamya': { fr: 'Bienvenue chez Warda Shamya', nl: 'Welkom bij Warda Shamya' },
  'Relax and enjoy your meal in our elegant dining area': {
    fr: 'Détendez-vous et savourez votre repas dans notre salle élégante',
    nl: 'Ontspan en geniet van uw maaltijd in onze elegante eetruimte',
  },
  'Quick and convenient — take your favorites to go': {
    fr: 'Rapide et pratique — emportez vos favoris',
    nl: 'Snel en handig — neem uw favorieten mee',
  },
  'Continue to Menu': { fr: 'Continuer vers le menu', nl: 'Doorgaan naar menu' },
  'You can change this anytime from the menu': {
    fr: 'Vous pouvez changer cela à tout moment depuis le menu',
    nl: 'U kunt dit altijd wijzigen via het menu',
  },
  '{name} restaurant hero image': { fr: 'Image héro du restaurant {name}', nl: 'Hero-afbeelding restaurant {name}' },
};

const en = JSON.parse(readFileSync(enPath, 'utf8'));
const glossary = {};
const leaves = new Set();

function collectLeaves(node) {
  if (typeof node === 'string') leaves.add(node);
  else if (Array.isArray(node)) node.forEach(collectLeaves);
  else if (node && typeof node === 'object') Object.values(node).forEach(collectLeaves);
}

collectLeaves(en);

for (const text of [...leaves].sort()) {
  glossary[text] = translateString(text);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(glossary, null, 2)}\n`, 'utf8');
console.log(`Wrote ${Object.keys(glossary).length} glossary entries to ${outPath}`);
