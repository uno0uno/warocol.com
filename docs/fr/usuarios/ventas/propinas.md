# Historique des pourboires

Depuis **Ventes → Pourboires**, vous consultez toutes les commandes qui ont encaissé un pourboire, avec leurs métriques et filtres dédiés.

## Comment accéder

Menu latéral → **Ventes** → onglet **Pourboires** (`/ventas/propinas`).

> Si les pourboires ne sont pas activés dans **Opérations → Pourboires**, cet écran affiche un état vide avec un bouton pour ouvrir la configuration.

---

## Métriques de la période

Trois cartes en haut, calculées sur la plage de dates et les filtres actifs :

| Métrique | Ce qu'elle affiche |
|----------|-------------------|
| **Total pourboires** | Somme des pourboires encaissés sur la période |
| **Moyenne par vente** | Pourcentage moyen de pourboire par rapport au sous-total des commandes avec pourboire |
| **Commandes avec pourboire** | Nombre de commandes ayant enregistré un pourboire |

---

## Filtres

| Filtre | Options |
|--------|---------|
| Recherche | Numéro de commande |
| Plage de dates | Aujourd'hui · Hier · Dernière semaine · 15 jours · 30 jours · 90 jours ou personnalisée |
| Serveur | Filtre par le serveur attribué |
| Canal | POS · Table · Online |
| Mode de paiement | Sélectionnez un groupe ou un mode spécifique |

Utilisez **Effacer les filtres** pour revenir à l'état initial (30 derniers jours, sans restrictions).

---

## Tableau des commandes avec pourboire

Chaque ligne affiche :

- **Date** de la commande
- **Commande** — numéro cliquable qui ouvre le détail sur `/ventas/{id}`
- **Canal** — badge avec POS, Table, Bar ou Online
- **Sous-total** de la vente
- **Pourboire** encaissé
- **%** sur le sous-total
- **Serveur** — cliquez pour refiltrer le tableau par ce serveur
- **Mode de paiement**

Vous pouvez trier par date, commande, sous-total, pourboire ou mode de paiement. Le tableau pagine par 25.

---

## Exporter

Le bouton **Exporter** envoie par e-mail un rapport avec toutes les commandes avec pourboire de la période et des filtres actifs. Le système affiche une fenêtre modale lorsque l'envoi est traité.

---

## Arriver pré-filtré depuis d'autres sections

- Depuis **Analytique → Ventes**, la carte « Pourboires de la période » ouvre cet écran avec la plage de dates du tableau de bord déjà appliquée.
- Depuis **Équipe → Membres → Voir le profil**, les pourboires de ce serveur ouvrent l'historique pré-filtré par son nom.

---

## Configurer les pourboires ?

La configuration (activer/désactiver, pourcentages suggérés, pré-sélection) se trouve dans **Opérations → Pourboires**. Cet écran est en lecture seule : un historique pour l'analyse et la réconciliation.
