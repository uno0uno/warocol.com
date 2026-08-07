# Modificateurs

## Qu'est-ce qu'un modificateur ?

Un modificateur est une option supplémentaire que le client peut choisir en commandant un produit. Les options sont regroupées dans un **groupe de modificateurs**.

**Exemples :**
- Groupe « Taille » → options : Petite, Moyenne, Grande
- Groupe « Sauce » → options : BBQ, Sauce rosée, Épicée
- Groupe « Sans... » → options : Sans oignon, Sans tomate, Sans salade
- Groupe « Suppléments » → options : Fromage supplémentaire (+2 000 $), Bacon (+3 000 $)

Chaque groupe est assigné à un ou plusieurs produits. Lors d'une commande, le client voit les options du groupe pour personnaliser.

---

## Concepts clés avant de commencer

**Groupe :** le nom de la catégorie d'options (ex. « Taille »).

**Modificateurs :** chaque option du groupe (ex. « Petite », « Moyenne », « Grande »). Chacune peut avoir un prix additionnel ou être gratuite.

**Obligatoire vs facultatif :** si le groupe est obligatoire, le client ne peut commander sans choisir au moins une option. S'il est facultatif, il peut l'ignorer.

**Sélection minimale et maximale :** combien d'options le client peut/doit choisir.
- Min 0, Max 1 → une option ou aucune
- Min 1, Max 1 → exactement une option
- Min 0, Max 3 → jusqu'à 3 options (comme des suppléments)

---

## Comment créer un groupe de modificateurs

Allez dans **Menu → Modificateurs → Nouveau groupe**.

Le formulaire comporte 3 étapes :

### Étape 1 — Informations du groupe

| Champ | Que saisir | Obligatoire |
|-------|------------|:-----------:|
| Produits | Les produits auxquels ce groupe s'applique | Oui |
| Nom du groupe | Ce que verra le client. Ex. `Taille`, `Suppléments`, `Sauce` | Oui |
| Sélection minimale | Nombre minimum d'options à choisir | Oui |
| Sélection maximale | Nombre maximum d'options à choisir | Oui |
| Ordre d'affichage | Si plusieurs groupes, celui qui apparaît en premier (nombre plus petit = premier) | Non |
| Obligatoire | Le client doit choisir avant de commander | — |

> **Astuce :** Pour les tailles où le client doit choisir une, mettez Min : 1 et Max : 1, et marquez obligatoire.

### Étape 2 — Options du groupe (modificateurs)

Ajoutez chaque option disponible. Pour chacune :

| Champ | Que saisir |
|-------|------------|
| **Type** | Comment l'inventaire est déduit à la vente (voir tableau) |
| Nom | Nom de l'option. Ex. `Grande`, `BBQ`, `Fromage supplémentaire` |
| Prix additionnel | Montant ajouté au prix de base. Si gratuit, 0. |
| Max / Ordre | Quantité max par ligne et ordre d'affichage |

Cliquez sur **+ Ajouter Modificateur** pour ajouter d'autres options.

#### Types d'option (composition et inventaire)

| Type affiché | Quand l'utiliser | Configuration | Inventaire à la vente |
|--------------|------------------|---------------|----------------------|
| **Article de stock** | Ingrédient du catalogue sans produit menu lié (matière première, fourniture, service) | Article + quantité + unité ; aussi **ajouter options par catégorie** | Cet article × quantité modificateur × quantité produit |
| **Revente** | Produit de revente (lié 1:1 à un article de stock) | Produit de revente + quantité + unité | L'article lié au produit est déduit |
| **Recette de base** | Plusieurs matières selon une préparation définie | Recette de base + multiplicateur (quantité × recette) | **Tous** les articles de la recette, selon le multiplicateur |
| **Produit du menu** | L'option consomme la composition d'un autre produit menu (plat avec recette, pas revente) | Produit du menu + multiplicateur | Composition/recette de ce produit (comme une portion) |
| **Prix seulement** | Supplément sans impact stock (ex. emballage, service, « sans glace ») | Nom et prix seulement | **Ne** modifie **pas** l'inventaire ; ajoute au total |

> **Revente vs article de stock :** les deux déduisent via un **article de stock**. En revente vous choisissez le **produit du menu** et WARO résout l'article lié (1 und). En article de stock vous choisissez directement du catalogue.

Si un article n'apparaît pas, utilisez **+ Créer un article de stock** dans le panneau latéral (Nom, Type de mesure et Catégorie obligatoires).

→ [En savoir plus sur les articles de stock propres](/docs/usuarios/abastecimiento#catálogo-de-bodega)

### Étape 3 — Révision

Vérifiez le résumé et cliquez sur **Créer un groupe**.

---

## Quand le modificateur ajoute au prix ?

Lorsque le client choisit une option avec prix additionnel, ce montant s'ajoute automatiquement au prix du produit au paiement (POS, tables et commandes en ligne).

---

## Inventaire et coûts à la vente

- Le **prix de vente** du modificateur est toujours enregistré sur la commande.
- La **déduction de stock** dépend du **type** : article de stock, revente, recette de base ou produit du menu déduisent selon leur composition ; **Prix seulement** ne déduit rien.
- Si vous modifiez une vente et **supprimez** un modificateur, WARO remet en inventaire les fournitures déduites pour cette option.
- Les coûts food cost / clôture comptable utilisent le détail des fournitures pour chaque modificateur.

---

## Questions fréquentes

**Puis-je assigner un groupe à plusieurs produits ?**
Oui. Lors de la création, sélectionnez tous les produits concernés.

**Puis-je modifier les options après création ?**
Oui. Allez dans **Menu → Modificateurs**, ouvrez le groupe et modifiez.

**Que se passe-t-il si je n'ajoute aucune option à l'étape 2 ?**
Le groupe est créé vide. Ajoutez les options plus tard depuis l'édition.

**Le client peut commander sans modificateur obligatoire ?**
Non. Si le groupe est obligatoire, le bouton d'ajout au panier reste désactivé jusqu'au choix.

**Puis-je mixer les types dans un groupe ?**
Oui. Ex. : tailles avec **Prix seulement**, extras avec **Article de stock** ou **Revente**, combo avec **Recette de base**.

**Le client choisit le type d'option ?**
Non. Vous configurez le type en administration ; en caisse le client voit nom et prix.
