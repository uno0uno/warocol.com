# Paie et prestations sociales

Depuis **Équipe → Paie**, vous gérez les **prestations sociales légales colombiennes** (Prima, Cesantías, Congés payés, Équipement de travail, Heures supplémentaires) et les paiements **PILA** (sécurité sociale).

> **Différence avec Salaires :** l'onglet **Salaires** gère les paiements mensuels du **salaire de base**. La Paie est complémentaire — elle gère les **prestations légales** et la **sécurité sociale**, qui sont payées à des fréquences différentes (semestrielles, annuelles, mensuelles selon le concept). Voir [Enregistrer un paiement de salaire](./registrar-pago).

## Comment accéder

Menu latéral → **Équipe → Paie**.

---

## Filtres

| Filtre | Options |
|--------|----------|
| Année | 5 dernières années |
| Mois | Mois spécifique de l'année sélectionnée |
| Recherche | Par nom de l'employé |

---

## Tableau des prestations

Une ligne par employé, une colonne par concept :

| Colonne | Ce qu'elle représente |
|---------|----------------|
| **Prime S1** | Prime de services du premier semestre (paiement en juin) |
| **Prime S2** | Prime de services du second semestre (paiement en décembre) |
| **Cesantías** | Contribution annuelle à la cesantía de l'employé |
| **Int. Cesantías** | Intérêts sur les cesantías (12 % par an) |
| **Congés payés** | Paiement des congés pris |
| **Équipement de travail** | Trois paiements par an (avril, août, décembre) pour les employés avec salaire ≤ 2 SMMLV |
| **Heures supplémentaires** | Paiements des heures supplémentaires de la période |

Chaque cellule affiche :

- **Badge vert avec montant** — la prestation a déjà été payée pour cette période
- **« En attente »** — le paiement n'a pas encore été enregistré

### Types de contrat

- **Employé** — s'applique à toutes les prestations
- **Journalier** — s'applique aux prestations sauf Équipement de travail
- **Entrepreneur** — exclu de cette vue (géré par honoraires)

---

## Enregistrer les prestations

Vous pouvez sélectionner plusieurs cellules à la fois :

- **Clic sur une cellule** — sélectionne ce paiement individuel
- **Clic sur une ligne** — sélectionne toutes les prestations de cet employé
- **Clic sur une colonne** — sélectionne ce concept pour tous les employés
- **Sélection en masse mixte** — combine des cellules individuelles

Lorsqu'une sélection est active, une **barre d'actions** apparaît en haut avec le total à enregistrer et un bouton pour ouvrir le panneau latéral de paiement.

### Panneau latéral de paiement

| Champ | Description |
|-------|-------------|
| Montant | Par défaut celui calculé par WARO ; vous pouvez l'ajuster |
| Date de paiement | Date à laquelle le décaissement a été effectué |
| Méthode de paiement | Virement, espèces, chèque, etc. |
| Référence | Numéro de justificatif (facultatif) |
| Notes | Observation supplémentaire (facultatif) |

Lors de la confirmation, toutes les prestations sélectionnées sont enregistrées comme payées et le badge passe au vert.

---

## PILA (Planilla Integrada de Liquidación de Aportes)

La section **PILA** est séparée en bas de l'écran. Il s'agit du paiement mensuel de sécurité sociale (santé, retraite, risques professionnels, parafiscaux) qui couvre à la fois la **cotisation de l'employé** et la **cotisation de l'employeur**.

### Périodes en attente

Liste les mois avec paiement de sécurité sociale en attente. Chaque ligne affiche :

- Mois et année
- Total à payer (cotisation employé + employeur)
- Nombre d'employés inclus

### Enregistrer le paiement PILA

1. Appuyez sur le bouton **Enregistrer PILA** de la ligne.
2. Saisissez la date et la méthode de paiement.
3. Joignez le justificatif PILA si vous l'avez.
4. Confirmez.

### Historique PILA

Sous les éléments en attente apparaît la liste des PILA déjà payés avec leur date, montant et méthode.

---

## Questions fréquentes

**WARO calcule-t-il automatiquement les montants de chaque prestation ?**
Oui, dans la plupart des cas. La plateforme utilise le salaire de base configuré de l'employé et les pourcentages légaux colombiens pour calculer Prima, Cesantías, Intérêts, Congés payés et Équipement de travail. Vous pouvez toujours ajuster le montant manuellement avant d'enregistrer le paiement.

**Quelle est la différence avec Enregistrer un paiement de salaire ?**
« Enregistrer le paiement » dans **Salaires** est le décaissement du salaire courant mensuel. **Paie** concerne les prestations légales et la sécurité sociale, qui ont des fréquences et des règles différentes.

**Et si j'ai un entrepreneur ?**
Les entrepreneurs sont exclus de cette vue car ils ne génèrent pas de prestations sociales. Leurs paiements sont gérés comme **Dépenses** (Finances → Dépenses) ou selon un schéma de salaire horaire, selon le cas.

**Puis-je payer les prestations de plusieurs employés à la fois ?**
Oui. Sélectionnez la colonne (par exemple, « Prime S1 ») et toutes les cellules de ce concept sont sélectionnées ; le panneau de paiement consolide le montant total.

**Comment savoir si un mois de PILA a déjà été payé ?**
S'il figure dans la liste des **historiques** et non dans **en attente**, il a déjà été enregistré. Pour voir le justificatif, ouvrez le détail du paiement.
