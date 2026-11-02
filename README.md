# Privacy Inspector / Web Shield

Extension Chrome pour consulter les requêtes et les cookies de l’onglet actif, avec un blocage activable des traceurs connus.

## Fonctionnalités

- Inspection des requêtes et des cookies par onglet.
- Blocage des requêtes tierces vers 15 domaines de traceurs connus et leurs sous-domaines.
- Activation ou désactivation via le bouton **Block trackers**, avec mémorisation du choix.
- Données conservées dans le navigateur, sans envoi vers un serveur.

Le blocage repose sur une liste de domaines connus : il ne protège pas contre toutes les formes de suivi. Les compteurs affichent les requêtes observées, sans inclure les requêtes bloquées. Les cookies existants ne sont pas supprimés.

## Installation

1. Télécharger et extraire ce dépôt.
2. Ouvrir `chrome://extensions` et activer le **Mode développeur**.
3. Cliquer sur **Charger l’extension non empaquetée**, puis sélectionner le dossier contenant `manifest.json`.
4. Ouvrir l’extension et activer **Block trackers**, puis recharger la page.

Pour une mise à jour, remplacer les fichiers et cliquer sur **Recharger** dans la fiche de l’extension. Chrome 102 ou plus récent est requis. L’extension n’est pas publiée sur le Chrome Web Store.

## Technologies et tests

JavaScript, HTML/CSS, Manifest V3 et APIs Chrome (`webRequest`, `declarativeNetRequest`, `storage`, `cookies`).

Lancer les tests avec `npm test`. Ils utilisent des APIs Chrome simulées ; une vérification dans le navigateur reste nécessaire.
