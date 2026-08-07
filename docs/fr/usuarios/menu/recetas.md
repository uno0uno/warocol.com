# Recettes

## Qu'est-ce qu'une recette ?

Une recette est une **composition réutilisable d'articles de stock** que vous pouvez assigner à un ou plusieurs produits. Elle évite de répéter la même liste d'articles de stock sur chaque produit.

**Exemple pratique :** Vous avez une sauce maison utilisée dans 5 plats différents. Au lieu d'ajouter les mêmes 6 articles de stock à chaque produit, vous créez une recette « Sauce maison » avec ces articles et la liez aux 5 produits. Si vous modifiez la recette, le changement s'applique à tous les produits qui l'utilisent.

Les recettes ne sont pas visibles pour vos clients. Elles sont internes : elles contrôlent les coûts et déduisent automatiquement les articles de stock de l'inventaire.

---

## Quand utiliser des recettes ?

Les recettes sont **facultatives**. Un produit peut avoir :

| Configuration | Quand l'utiliser |
|---------------|------------------|
| Articles de stock directs uniquement | Le produit est simple et unique — personne d'autre utilise ces articles dans cette combinaison |
| Recettes uniquement | La préparation est partagée avec d'autres produits |
| Recettes + articles de stock supplémentaires | Vous avez une base commune (recette) plus des articles propres au plat |

> Si un produit est unique et simple, ajoutez les articles de stock directement sans créer une recette. Les recettes sont utiles lorsqu'elles sont **réutilisées**.

---

## Comment créer une recette

Allez dans **Menu → Recettes → Nouvelle Recette de Base**.

Le formulaire comporte 3 étapes :

### Étape 1 — Informations générales

| Champ | Que saisir |
|-------|------------|
| Nom | Le nom interne de la recette. Ex. `Sauce maison`, `Base de viande`, `Pâte à pizza` |
| Statut | Active ou Inactive. Mettez active si vous l'utilisez déjà. |

> Le nom est pour usage interne. Utilisez des noms qui décrivent la préparation, pas le produit final.

### Étape 2 — Articles de stock

Ici vous ajoutez chaque article de stock avec sa quantité.

- Recherchez l'article par nom dans le champ de recherche
- Saisissez la quantité et l'unité (grammes, millilitres, unités, etc.)
- Répétez pour chaque article

**Si l'article de stock n'existe pas :** la recherche affiche l'option **+ Créer un article de stock**. Cliquez pour l'ouvrir dans un panneau latéral sans quitter le formulaire.

En créant l'article depuis ici, complétez :

| Champ | Obligatoire | Notes |
|-------|:-----------:|-------|
| Nom | Oui | Ex. `Bœuf Angus spécial` |
| Type de mesure | Oui | Poids (gr/kg), Volume (ml/lt) ou Pièce (und). Défini uniquement à la création — ne change pas ensuite. |
| Catégorie | Oui | Ex. `Viandes`, `Sauces`, `Produits laitiers` |

Les unités d'achat sont générées automatiquement selon le type de mesure. Une fois l'article enregistré, il est immédiatement disponible pour la recette.

→ [En savoir plus sur les articles de stock propres](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

### Étape 3 — Révision et confirmation

Vérifiez le résumé : nom, nombre d'articles de stock et statut. Si tout est correct, cliquez sur **Créer la recette**.

---

## Puis-je modifier une recette plus tard ?

Oui. Allez dans **Menu → Recettes**, trouvez la recette et cliquez dessus pour la modifier. Le changement s'applique à tous les produits qui l'utilisent à partir de ce moment — les commandes déjà enregistrées ne sont pas affectées.

---

## Questions fréquentes

**Une recette est-elle obligatoire pour créer un produit ?**
Non. Vous pouvez créer un produit avec des articles de stock directs, sans aucune recette.

**Un produit peut avoir plusieurs recettes ?**
Oui. Vous pouvez assigner plus d'une recette au même produit, et aussi ajouter des articles de stock supplémentaires en dehors de ces recettes.

**Puis-je avoir deux recettes avec le même nom ?**
Oui, le système le permet, mais ce n'est pas recommandé. Utilisez des noms descriptifs pour ne pas vous tromper.

**Que se passe-t-il si je modifie les articles de stock d'une recette ?**
Le changement s'applique à partir de ce moment à tous les produits qui utilisent cette recette. Les ventes déjà enregistrées ne changent pas.
