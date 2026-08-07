# Journal d'activités des opérations

Le **Journal d'activités** est le registre d'audit du POS : qui a fait quoi, sur quel canal (table, bar ou comptoir), quand et — quand applicable — avec quel motif. Il permet aux propriétaires, administrateurs et superviseurs de revoir les suppressions de produits, les vidages d'onglet ou de panier et les annulations de paiements partiels.

## Comment accéder

Menu latéral → **Opérations → Journal d'activités**.

Vous verrez une liste paginée d'événements. En haut vous pouvez filtrer par dates, canal, type d'action et rechercher par nom de produit. Cliquez sur une ligne pour voir le détail technique de l'événement (utile pour le support).

> **Permissions :** seuls les utilisateurs avec accès au module **Opérations** peuvent ouvrir le journal (typiquement propriétaire, administrateur et superviseur). Le personnel de caisse sans ce module ne verra pas l'onglet ni pourra consulter l'historique.

---

## Ce que le journal enregistre (POS)

Chaque ligne est un événement automatique généré quand l'équipe utilise le POS après activation de la fonction pour votre commerce.

| Action dans le journal | Signification |
|------------------------|---------------|
| **Produit ajouté à l'onglet** | Un article a été ajouté à l'onglet d'une table ou du bar |
| **Produit supprimé de l'onglet** | Un article a été retiré de l'onglet (table/bar) |
| **Quantité modifiée** | La quantité d'un article dans l'onglet a été modifiée |
| **Onglet vidé** | L'onglet d'une session table ou bar a été vidé |
| **Ligne supprimée du panier** | Un produit a été retiré du panier comptoir ou bar |
| **Panier vidé** | Le panier entier a été vidé |
| **Paiement annulé** | Un paiement partiel déjà enregistré au checkout a été annulé |

Sur chaque événement vous verrez, entre autres :

- **Quand** — date et heure
- **Utilisateur** — qui a effectué l'action
- **Canal** — Table, Bar ou Comptoir
- **Résumé** — produit et quantité, ou données du paiement annulé
- **Table** — nom de la table si applicable
- **Motif** — texte saisi dans le POS (voir politiques ci-dessous)
- **Commande** — lien vers la vente si elle existe

---

## Ce qu'il n'enregistre pas

| Situation | Pourquoi ça n'apparaît pas |
|-----------|----------------------------|
| Produits dans le panier **avant envoi à l'onglet** ou avant synchronisation du panier avec le serveur | Seules les actions reçues par le serveur sont auditées |
| Actions **antérieures au déploiement** du journal pour votre commerce | L'enregistrement commence à l'activation en production ; il ne reconstitue pas le passé |
| Annulation d'une **vente complète** depuis Ventes → Commandes | C'est un autre flux ; pas la même chose qu'annuler un paiement partiel au checkout |
| Changements de prix, remises ou configuration du menu | Hors périmètre MVP du POS |

Si la liste est vide juste après activation, c'est normal : les événements apparaissent quand le personnel utilise la version qui inclut le journal.

---

## Comment filtrer

| Filtre | Utilité |
|--------|---------|
| **Plage de dates** | Limite la période (calendrier avec raccourcis comme Aujourd'hui, Semaine dernière, etc.) |
| **Canal** | Table seule, Bar seul, Comptoir seul, ou tous |
| **Action** | Un type précis (ex. seulement « Paiement annulé » ou « Produit supprimé de l'onglet ») |
| **Rechercher produit** | Texte libre sur le résumé (nom du produit dans le payload) |

Utilisez **Effacer** pour supprimer tous les filtres. La liste se met à jour en changeant les filtres ou avec le bouton d'actualisation du panneau.

---

## Politiques de motif

### Produit déjà envoyé en cuisine (table ou bar)

Si les **tickets de cuisine** sont actifs et le produit **est déjà en cuisine** (plus en statut « nouveau »), le retrait de l'onglet exige un **motif obligatoire** avant confirmation. Ce texte est stocké dans la colonne **Motif** du journal et la cuisine continue de voir la ligne annulée sur le KDS.

Si le produit **n'a pas encore été envoyé en cuisine**, vous pouvez le retirer sans motif.

### Annulation d'un paiement partiel

Au **checkout**, en retirant un paiement déjà enregistré (icône corbeille sur paiement partiel), vous pouvez saisir un motif optionnel. Si vide, le système enregistre **« Sans motif »** dans le journal.

> Si le paiement était en **espèces**, le POS rappelle de rendre l'argent physiquement au client avant confirmation. Voir [Paiement partiel](../pos#cobro-parcial-split) dans le guide POS.

---

## Détail d'un événement

Cliquez sur une ligne (ou carte sur mobile) pour ouvrir le détail. Vous y verrez le **motif** complet, le lien **commande** si existant, et le **payload** en format technique (JSON) — utile si le support doit investiguer.

---

## Liens avec d'autres écrans

| Vous avez besoin de… | Allez à… |
|----------------------|----------|
| Configurer tables, tickets ou pourboires | [Opérations](../operaciones) |
| Comment annuler un paiement ou retirer un produit au POS | [Traiter une vente au POS](../pos) |
| Historique des ventes et annulation de commande complète | [Ventes](../ventas) |
| Numéros de facturation DIAN abandonnés | [Facturation — Journal des numéros brûlés](../facturacion#bitácora-de-números-quemados) (registre distinct) |

---

## Questions fréquentes — Journal d'activités

**Le journal remplace les caméras ou le rapprochement de caisse ?**
Non. C'est un registre d'actions sensibles au POS, pas une vidéo ni une clôture de caisse.

**Le caissier peut voir le motif du gérant ?**
Seulement si son rôle a accès à **Opérations**. La plupart des caissiers ne voient pas le journal.

**Peut-on exporter vers Excel ?**
Pas d'export depuis l'écran dans le MVP ; utilisez filtres et pagination pour revoir par période.

**Pourquoi je ne vois pas les événements d'hier si nous utilisions déjà WARO ?**
L'enregistrement a commencé quand votre commerce a la version avec journal ; il ne reconstruit pas l'historique antérieur.

**Retirer un produit du panier comptoir est toujours enregistré ?**
Oui, quand le panier est synchronisé avec le serveur. Les changements uniquement locaux, avant sauvegarde, ne génèrent pas un événement.
