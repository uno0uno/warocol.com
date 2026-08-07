# Tables

La gestion des tables permet d'organiser la salle de votre restaurant directement depuis le POS. Lorsqu'elle est active, le point de vente affiche le plan de salle et chaque table a sa propre session de commande.

## Comment accéder

Menu latéral → **Opérations → Tables**. Depuis ici vous pouvez :

- Activer ou désactiver le module tables pour le POS
- Activer la **commande par QR à table** et gérer le lien QR de chaque table
- Voir la liste des tables configurées avec leur statut actuel et, si applicable, le serveur assigné
- Créer, modifier, désactiver et réactiver des tables

> L'étiquette du module est configurable. Certains commerces l'appellent « Cabines » (salons), « Chambres » (hôtels), « Pistes » (événements), etc. La configuration se fait dans **Opérations → Personnaliser**. Ce guide utilise « Table » comme terme générique.

---

## Activer le module tables

En haut de la page vous verrez le toggle **Gestion des tables**.

- **Activé** — le POS affiche le plan de salle à l'ouverture et chaque table a sa propre session de commande.
- **Désactivé** — le POS fonctionne uniquement en mode comptoir.

> Le changement se reflète dans le POS instantanément. Si vous avez une caisse ouverte en service, rechargez l'onglet POS pour voir le changement.

---

## Configurer les tables

### Créer une table

Cliquez sur **+ Nouvelle table**. Saisissez :

| Champ | Description |
|-------|-------------|
| Nom | Identifiant de la table (ex. « Table 1 », « Terrasse A ») |
| Capacité | Nombre de personnes (optionnel) |

### Modifier une table

Cliquez sur l'icône de modification à côté de la table. Vous pouvez changer le nom et la capacité.

### Désactiver une table

Cliquez sur l'icône de désactivation. WARO demandera confirmation avant de continuer.

Vous ne pouvez pas désactiver une table avec une session ouverte. Fermez d'abord la commande depuis le POS.

### Réactiver une table désactivée

Les tables désactivées ne sont pas supprimées : elles restent dans une liste séparée. Pour les réactiver :

1. Filtrez la liste par **Désactivées** (ou développez la section « Tables inactives »).
2. Touchez l'icône de réactivation sur la table correspondante.
3. Confirmez — la table réapparaît immédiatement sur le plan de salle.

---

## Statuts des tables

| Statut | Signification |
|--------|----------------|
| **Libre** | Pas de commande active, disponible pour servir |
| **Occupée** | Commande en cours |
| **Demande de l'addition** | Le client a demandé l'addition |

---

## Colonne Serveur (optionnel)

Si votre commerce a l'**attribution des serveurs** activée (dans **Opérations → Pourboires**), une colonne supplémentaire affiche le serveur effectif de la session actuelle de chaque table. Cela facilite savoir qui sert chaque table avant encaissement.

---

## Commande par QR à table

Permet aux clients de commander depuis leur téléphone en scannant un code sur la table. La commande **n'entre pas dans le POS ni la cuisine** tant que le personnel ne l'**accepte** pas dans **Expédition → Commandes à table (QR)**.

### Prérequis

1. **Gestion des tables** active (toggle supérieur de cette page).
2. **Commande par QR à table** active (second toggle dans le bloc modules).
3. Chaque table avec QR **activé** et lien généré.
4. Produits avec **Commande à table (QR)** coché dans **Menu → Produits** (indépendant des livraisons).

### Activer le module QR

Dans le même bloc modules, sous **Gestion des tables**, vous verrez **Commande par QR à table**.

- **Activé** — vous pouvez activer le QR par table et les clients peuvent envoyer des commandes en attente de confirmation.
- **Désactivé** — les contrôles QR ne s'affichent ni dans la liste ni dans le panneau de la table.

### QR par table

Avec le module QR actif, chaque table a des contrôles pour :

| Action | Utilité |
|--------|---------|
| Activer le QR sur cette table | Génère le lien public de cette table |
| **Copier le lien** | Coller dans WhatsApp ou où vous partagez le menu |
| **Télécharger PNG** | Image du code QR à imprimer sur la table |
| **Régénérer le lien** | Invalide l'ancien QR et crée un nouveau (réimprimez si vous avez déjà distribué des codes) |

Le lien a la forme `https://warocol.com/{votre-commerce}/mesa/{code}` et **reste stable** tant que vous n'utilisez pas **Régénérer le lien**.

Sur ordinateur vous verrez aussi une colonne **QR** dans le tableau des tables avec accès rapide pour copier et télécharger.

### Ce que fait le client

1. Scanne le QR ou ouvre le lien.
2. Voit le menu (produits marqués pour QR uniquement).
3. Compose la commande, choisit le mode de paiement et envoie.
4. Voit un message de confirmation : le restaurant vérifiera la commande avant préparation.

### Ce que fait le personnel ensuite

Les commandes en attente apparaissent dans **Expédition → Commandes à table (QR)** en liste (une ligne par commande). Cliquez sur la commande pour le détail et appuyez sur **Accepter la commande** ou **Rejeter**. Une fois acceptée, les articles sont ajoutés à l'onglet de cette table dans le **POS** et, si les tickets sont actifs, envoyés en cuisine. Voir [Expédition](../despacho#pedidos-en-mesa-qr).

La cloche de notifications ouvre le **détail** de la commande quand disponible ; sinon, la liste filtrée par cette table.

---

## Questions fréquentes

**Où sont prises les commandes des tables ?**
Depuis le **POS**. En entrant avec le module actif vous voyez le plan de salle ; cliquez sur une table pour ouvrir sa session.

**Peut-on avoir des tables configurées sans activer le module ?**
Oui. Les tables restent enregistrées même si le module est désactivé. En le réactivant, toutes les tables réapparaissent sur le plan.

**Que se passe-t-il si je désactive le module avec des tables occupées ?**
Le toggle change la vue POS, mais les sessions ouvertes ne se ferment pas. Nous recommandons de fermer toutes les commandes avant de désactiver le module.

**Une table désactivée est perdue pour toujours ?**
Non. Elle reste dans la liste des tables inactives et vous pouvez la réactiver quand vous voulez.

**Quelle différence avec la commande QR Livraisons ?**
Dans **Livraisons**, le client commande via le canal en ligne (livraison, retrait ou sur place) et la commande suit des statuts comme En attente → Confirmée → En préparation. Avec la **commande QR à table**, le client est physiquement à une table précise, le menu est uniquement pour cette table et la commande reste **en attente d'acceptation** dans **Expédition → Commandes à table (QR)** jusqu'à confirmation par le personnel.

**L'URL change si je rouvre Opérations → Tables ?**
Non. Le lien est stable tant que vous n'utilisez pas **Régénérer le lien** sur cette table.

**Que voit le client après envoi de la commande ?**
Un écran de succès indiquant que le restaurant confirmera la commande. Les articles **ne** apparaissent **pas** dans le POS et ne sont pas préparés tant que quelqu'un ne les **accepte** dans Expédition.

**Un produit n'apparaît pas dans le menu QR ?**
Vérifiez que **Commande à table (QR)** est actif dans **Menu → Produits**, et que le module QR et le QR de cette table sont activés.
