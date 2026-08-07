# Créer un produit

## Qu'est-ce qu'un produit ?

Un produit est ce que vos clients voient et peuvent commander : il a un nom, un prix, une description et une catégorie. C'est ce qui apparaît sur votre menu.

**Exemples :** Pizza Margherita, Hamburger classique, Limonade nature.

---

## Comment fonctionne la composition d'un produit

Chaque produit peut avoir des articles de stock assignés de trois façons — vous pouvez utiliser l'une ou les combiner :

| Option | Quand l'utiliser |
|--------|------------------|
| **Articles de stock directs uniquement** | Le produit est unique et ne partage pas sa préparation avec d'autres plats |
| **Recettes uniquement** | La préparation est une recette déjà créée utilisée dans plusieurs produits |
| **Recettes + articles de stock supplémentaires** | Vous avez une base commune (recette) plus des articles propres à ce plat |

> **Avec recette** dans l'assistant : WARO déduit l'inventaire selon la recette lors de la vente.
>
> **Vente directe** (revente) : vendue à la pièce (`und`) ; le système crée l'article de stock et l'équivalence en gr ou ml.

**Quand créer une recette d'abord ?** Seulement lorsque cette préparation est réutilisée dans plusieurs produits. Si le plat est unique, ajoutez les articles de stock directement au produit. → [voir le guide des recettes](./recetas.md)

---

## Comment créer un produit

Allez dans **Menu → Produits → Nouveau produit**.

L'assistant a **4 étapes** si vous choisissez **Avec recette**, ou **3 étapes** si vous choisissez **Revente** (sans étape recette).

### Taxe du produit

Si votre entreprise utilise des **taxes commerciales** (lignes dans Facturation), le produit **hérite** de la taxe de sa **catégorie de menu**. Vous pouvez laisser ainsi, marquer **exonéré** ou choisir **une autre ligne**. Cette surcharge prime sur le mapping de la catégorie.

En Colombie avec une matrice fiscale par colonnes, vous choisissez encore Aliment/Boisson, Liqueur ou Exonéré.

### Étape 1 — Type de produit

Choisissez comment il est préparé ou vendu :

| Option | Signification |
|--------|---------------|
| **Avec recette** | Cuisine · articles de stock et recettes de base ; chaque vente déduit l'inventaire |
| **Revente** | Revente · pièce (`und`) avec équivalence en gr ou ml |

### Étape 2 — Informations générales

| Champ | Que saisir | Obligatoire |
|-------|------------|:-----------:|
| Nom du produit | Le nom que verront vos clients. Ex. `Pizza Margherita` | Oui |
| Description | Brève description du plat | Non |
| Catégorie | Groupe (Entrées, Plats principaux, Boissons...) | Oui |
| Prix de vente | Prix en pesos colombiens | Oui |
| Temps de préparation | Durée en minutes (uniquement **Avec recette**) | Non |
| Équivalence gr/ml | Poids ou volume par unité vendue (uniquement **Revente**) | Oui |
| Disponible | S'il est actif sur votre menu | — |
| Disponible pour la livraison | S'il apparaît dans les commandes en ligne (livraison/retrait) | — |
| Commande à table (QR) | S'il apparaît sur le menu QR des tables | — |

> Si vous désactivez **Disponible**, le produit n'apparaît sur aucun menu jusqu'à réactivation.
>
> **Commande à table (QR)** est indépendant de la livraison.

### Étape 3 — Recette (Avec recette uniquement)

Ici vous définissez la composition du produit :

**Ajouter des recettes** — cliquez sur **+ Ajouter Recette de base** et recherchez une recette existante.

**Ajouter des articles de stock directs** — ajoutez les articles un par un avec leur quantité.

**Si l'article de stock n'existe pas :** la recherche affiche **+ Créer un article de stock** (panneau latéral sans quitter le formulaire).

→ [En savoir plus sur les articles de stock propres](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

Vous pouvez laisser recettes et articles vides à la création ; vous pourrez compléter plus tard, mais le coût et la déduction d'inventaire seront plus précis avec la recette définie.

### Étape 4 — Révision et confirmation

Vérifiez le résumé : nom, catégorie, recette ou données de revente, et statut. Si tout est correct, cliquez sur **Créer un produit**.

---

## Le produit apparaît-il immédiatement sur le menu en ligne ?

Oui, si **Disponible pour la livraison** est coché. Sinon, le produit existe dans le système mais n'est pas visible pour les clients en ligne.

---

## Questions fréquentes

**Puis-je changer le prix plus tard ?**
Oui. Allez dans **Menu → Produits**, ouvrez le produit et modifiez-le.

**Que se passe-t-il si je n'assigne ni recettes ni articles de stock (Avec recette) ?**
Le produit fonctionne pour les ventes, mais WARO ne peut pas calculer son coût ni déduire les articles de stock automatiquement tant que la recette n'est pas définie.

**Puis-je assigner plusieurs recettes au même produit ?**
Oui. Vous pouvez combiner plusieurs recettes et ajouter des articles de stock supplémentaires.

**Comment ajouter des modificateurs (tailles, extras, sauces) ?**
Les modificateurs sont créés séparément et assignés à un ou plusieurs produits. Voir [guide des modificateurs](./modificadores.md).

**Comment ajouter une photo au produit ?**
À l'étape d'informations générales, ou depuis l'édition du produit après création.
