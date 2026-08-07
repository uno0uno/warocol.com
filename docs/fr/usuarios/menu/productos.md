# Produits

## Qu'est-ce qu'un produit ?

Un produit est ce que vos clients voient et peuvent commander : nom, prix, description et photo. C'est ce qui apparaît sur votre menu.

**Exemples :** Pizza Margherita, Hamburger classique, Limonade nature.

---

## Avant de créer un produit

Chaque produit peut être lié à une recette de base. La recette indique à WARO quels articles de stock ce produit consomme, pour calculer les coûts et contrôler l'inventaire.

Si vous voulez ce contrôle, créez la recette d'abord. Si vous devez seulement enregistrer le produit pour l'instant, vous pouvez le créer sans recette et l'ajouter plus tard.

**Ordre recommandé :** recette → produit.

---

## Comment créer un produit

Allez dans **Menu → Produits → Nouveau produit**.

Le formulaire comporte 3 étapes :

### Étape 1 — Informations générales

| Champ | Que saisir | Obligatoire |
|-------|------------|:-----------:|
| Nom du produit | Le nom que verront vos clients. Ex. `Pizza Margherita` | Oui |
| Description | Brève description du plat | Non |
| Catégorie | Groupe (Entrées, Plats principaux, Boissons...) | Oui |
| Prix de vente | Prix en pesos colombiens | Oui |
| Coût réel (système) | Calculé par WARO depuis la recette et les achats d'articles de stock (lecture seule) | — |
| Mon coût du plat | Coût opérationnel que vous définissez pour marges et rapports ; le système ne le modifie pas | Non |
| Temps de préparation | Durée en minutes | Non |
| Disponible | S'il est actif sur votre menu | — |
| Disponible pour la livraison | S'il apparaît dans les commandes en ligne (livraison/retrait) | — |
| Commande à table (QR) | S'il apparaît sur le menu QR des tables (seulement si le module QR est actif dans Opérations) | — |

> Si vous désactivez **Disponible**, le produit n'apparaît sur aucun menu jusqu'à réactivation.
>
> **Commande à table (QR)** est indépendant de la livraison : un produit peut être sur le QR de table sans être en livraison, et vice versa.

### Étape 2 — Recette / Articles de stock

Ici vous liez le produit à une ou plusieurs recettes de base déjà créées.

- Cliquez sur **+ Ajouter Recette de base**
- Recherchez et sélectionnez la recette
- Si le produit n'a pas encore de recette, vous pouvez laisser cette étape vide et continuer

### Étape 3 — Révision et confirmation

Vérifiez le résumé : nom, catégorie et statut. Si tout est correct, cliquez sur **Créer un produit**.

---

## Coût réel vs mon coût du plat

WARO gère deux coûts par produit :

| Concept | Qui le définit | Utilité |
|---------|----------------|---------|
| **Coût réel (système)** | WARO, à l'enregistrement avec recette | Reflète articles de stock et prix d'achat ; se met à jour si achats ou recette changent |
| **Mon coût du plat** | Vous, facultatif | Votre référence opérationnelle (main-d'œuvre, perte, autre fournisseur, etc.) |

Dans la liste vous voyez **Marge réelle** (prix vs coût système) et **Marge opérationnelle** (prix vs votre coût), si vous avez défini « Mon coût ».

Si les deux coûts diffèrent beaucoup, la ligne est surlignée en ambre pour réviser votre coût perçu ou la recette.

---

## Le produit apparaît-il immédiatement sur le menu en ligne ?

- **Livraison / commandes en ligne :** oui, si **Disponible pour la livraison** est coché.
- **QR à table :** oui, si **Commande à table (QR)** est coché et le module QR est actif dans **Opérations → Tables**.

Sans l'une des deux, le produit existe dans le système mais n'est pas visible sur ces canaux.

---

## Questions fréquentes

**Puis-je changer le prix plus tard ?**
Oui. Allez dans **Menu → Produits**, ouvrez le produit et modifiez.

**Que se passe-t-il si je n'assigne pas une recette ?**
Le produit fonctionne pour les ventes, mais WARO ne peut pas calculer son coût ni déduire les articles de stock automatiquement.

**Le même produit peut être dans plusieurs catégories ?**
Non. Chaque produit appartient à une seule catégorie. Pour plusieurs emplacements, envisagez variantes ou modificateurs.

**Comment ajouter une photo au produit ?**
Depuis l'écran d'édition du produit, après création.

**Pourquoi un produit n'apparaît pas sur le menu QR de table ?**
Vérifiez **Commande à table (QR)** sur le produit et que le module est actif dans **Opérations → Tables**. Voir [Tables](../../operaciones/mesas#pedido-por-qr-en-mesa).
