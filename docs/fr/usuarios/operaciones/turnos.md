# Quarts

Les **quarts** sont des modèles d'horaire réutilisables (nom + heure de début et de fin) utilisés pour un rapprochement de caisse **Par modèle** dans Finances. Ils ne remplacent pas la planification du personnel ni le suivi des présences : ils définissent uniquement la plage horaire que le rapprochement de caisse va concilier.

## Comment accéder

Menu latéral → **Opérations → Quarts**.

En haut vous verrez combien de quarts sont actifs et inactifs. La liste affiche nom, horaire et statut.

> **Permissions :** configurer les quarts nécessite l'accès au module **Opérations**. Enregistrer un rapprochement avec ce modèle se fait dans **Finances → Rapprochement de caisse** (module **Finances**). Voir [Rapprochement de caisse](../finanzas#arqueo-de-caja).

---

## Créer un quart

Cliquez sur **+ Nouveau quart**. Complétez :

| Champ | Description |
|-------|-------------|
| **Nom** | Identifiant visible (ex. Matin, Après-midi, Soir). Obligatoire, jusqu'à 80 caractères. |
| **Début** | Heure de début du quart (format 24 h). |
| **Fin** | Heure de fin du quart. |
| **Passe minuit** | Activez si le quart se termine le jour suivant (ex. 22:00 – 06:00). |

Confirmez avec **Créer le quart**. Le quart est **actif** immédiatement et apparaît dans le menu des rapprochements par modèle.

---

## Modifier un quart

Cliquez sur l'icône crayon à côté du quart. Vous pouvez changer le nom, les heures et **Passe minuit**. Enregistrez avec **Enregistrer les modifications**.

Les rapprochements **déjà enregistrés** conservent l'étiquette du nom au moment de la clôture ; modifier le modèle ne réécrit pas l'historique.

---

## Désactiver et réactiver

- **Désactiver** — le quart n'apparaît plus lors d'un nouveau rapprochement, mais reste visible dans la liste comme inactif. Les rapprochements passés qui l'utilisaient ne sont pas modifiés.
- **Réactiver** — il redevient disponible dans Finances → Rapprochement → **Par modèle**.

Les quarts ne sont pas supprimés depuis l'interface ; la désactivation est la façon de retirer un modèle que vous n'utilisez plus.

---

## Lien avec le rapprochement de caisse

| Action | Où |
|--------|-----|
| Définir des modèles (Matin, Après-midi…) | **Opérations → Quarts** |
| Clôturer la caisse avec un modèle | **Finances → Rapprochement → Par modèle** |
| Clôturer avec heures manuelles sans modèle | **Finances → Rapprochement → Plage horaire personnalisée** |
| Clôturer la journée calendaire complète | **Finances → Rapprochement → Journée complète** |

Lors d'un rapprochement par modèle vous choisissez le **quart** et le **jour** ; les heures sont remplies selon le modèle. Vous pouvez faire plusieurs rapprochements le même jour si les plages **ne se chevauchent pas** (par exemple Matin et Après-midi). Voir la section *Plusieurs rapprochements le même jour* dans [Rapprochement de caisse](../finanzas#arqueo-de-caja).

---

## Questions fréquentes — Quarts

**Les quarts contrôlent qui peut encaisser au POS ?**
Non. Ils définissent uniquement des plages horaires pour le rapprochement de caisse.

**Peut-on avoir deux modèles avec le même horaire ?**
Oui, si les noms diffèrent (ex. « Matin salle » et « Matin terrasse »). Au rapprochement vous choisissez celui qui s'applique.

**J'ai désactivé un quart et il n'apparaît plus au rapprochement. Que faire ?**
Réactivez-le via l'icône flèche circulaire dans la liste, ou créez un nouveau modèle.

**Quart de nuit qui passe d'un jour à l'autre ?**
Activez **Passe minuit** en créant ou modifiant le modèle (ex. 22:00 – 06:00).
