# Projet Télétravail v3 — Suivi

> **App** : Convention Télétravail (Power Apps Canvas)
> **Contexte** : Refonte v3 — ajout avenants, refonte formulaire, améliorations techniques et UX
> **Planning** : ~8 jours effectifs sur 4 semaines

---

## Décisions prises

| # | Décision | Détail |
|---|----------|--------|
| D1 | Convention unique par agent | Si changement de direction/poste, suppression auto convention + avenants |
| D2 | Avenant = nouvelle ligne dans `RH-DemandesTeletravail` | Colonne `Demande` = "Convention" ou "Avenant", même circuit de validation (N+1 → N+2) via `ListeDesDemandes` |
| D3 | Dernier avenant = référence active | L'app calcule `fxUserConventionActive` = dernier avenant validé, sinon convention d'origine |
| D4 | Flux Power Automate à refaire | Restructuration complète, abandon des ifs imbriqués |
| D5 | Migration vers formulas | Remplacement progressif des `Set()` globaux par des formulas et variables locales |
| D6 | Suppression des toggles de test | Remplacés par un écran admin qui set des variables |
| D7 | Deux colonnes pour le suivi | `Statut_Demande` = où on en est dans le cycle. `Resultat` = issue de la demande (positionné une fois, ne bouge plus). |
| D8 | Nettoyage colonnes SP | Supprimer : `Entretien_Retour_Presentiel`, `EncadrementAgent`, `Avenant` (colonne date, inutilisée). Supprimer config `MultiDemandes_ON`. |
| D9 | Changements valeurs choix SP | `QuotiteTemps` : "Inférieur à 70%" → "< 70%". `LieuTT` : valeurs = Domicile / Tiers lieu. `EquipementsPro` : retirer VPN. |
| D10 | Équipements pro — migration douce | Téléphones : on garde l'info existante mais on ne l'affiche plus dans le formulaire v3. Logiciels : changement d'intitulé OK. |

---

## Actions

### Données / SharePoint

| # | Action | Priorité | Statut |
|---|--------|----------|--------|
| A1 | **Exploiter `Statut_Demande` + ajouter `Resultat`** — `Statut_Demande` : colonne existante, vide, à remplir avec le cycle (voir annexe). `Resultat` : nouvelle colonne Choix. Voir annexe pour les valeurs. | Haute | ✅ Colonnes créées, à déployer preprod/prod |
| A1b | **Script migration `Statut_Demande` + `Resultat`** — Script PowerShell pour remplir les deux colonnes sur les lignes existantes en fonction des colonnes actuelles (décisions, dates). À déployer sur les 3 env. | Haute | À faire |
| A2 | **Colonnes à ajouter** — `Agent` (Personne), `Demande` (Choix: Convention/Avenant). Modification de `Title` → "Nom Prénom - Convention" ou "- Avenant X". | Haute | ✅ DEV, à déployer preprod/prod |
| A3 | **Vérifier orthographe "Occasionel"** — Comparer la valeur dans le choix SharePoint vs le code Power Apps. | Moyenne | ✅ Corrigé — "Occasionnel" partout |
| A4 | **Indexer les colonnes filtrées** — Au minimum `Matricule` et `Demande` sur la liste TT pour la délégation. À faire sur les 3 env (DEV, preprod, prod). | Moyenne | À faire |
| A16 | **Supprimer colonnes SP** — `Entretien_Retour_Presentiel`, `EncadrementAgent`, `Avenant` (date). Script PnP sur les 3 env. Vérifier qu'aucune vue/flux ne les référence avant suppression. | Moyenne | À faire |
| A17 | **Modifier valeurs choix SP** — `QuotiteTemps` : renommer "Inférieur à 70%" → "< 70%". `LieuTT` : s'assurer que les valeurs sont Domicile / Tiers lieu. `EquipementsPro` : retirer VPN des choix. Script PnP sur les 3 env. | Moyenne | À faire |
| A18 | **Supprimer config `MultiDemandes_ON`** — Retirer de la liste Config + supprimer le code associé dans le chargement de l'app. | Basse | À faire |

### App Power Apps

| # | Action | Priorité | Statut |
|---|--------|----------|--------|
| A5 | **Sécurité écran admin** — Ajouter un contrôle d'accès sur le routing `ModifDemandeID`. Aujourd'hui aucun check, un agent peut forger l'URL. | **Critique** | À faire |
| A6 | **Implémenter `fxUserConventionActive`** — Formula qui retourne le dernier avenant validé ou la convention si pas d'avenant. Utiliser partout pour l'affichage des jours/quotité en cours. | Haute | À faire |
| A7 | **Compléter `fxUserTTStatus`** — Remplacer `varHasAvenants: false` par la vraie logique basée sur `fxUserAvenants`. | Haute | À faire |
| A8 | **Cohérence lecture décisions** — L'app agent ne lit que la liste TT. Seul le flux écrit les décisions dans la liste TT (miroir de la liste validation). | Moyenne | À noter |
| A9 | **Tester délégation `fxUserAvenants`** — Le filtre combiné `Matricule && Or(EligibleTT) && Demande` doit être validé comme délégable. | Moyenne | À tester |
| A15 | **Harmoniser la casse pour `EligibleTT`** — Certains endroits font `Lower()` avant de comparer, d'autres comparent directement les valeurs du choix. Choisir une convention (comparer directement les `.Value` sans `Lower()`) et l'appliquer partout. | Moyenne | À faire |

### Flux Power Automate

| # | Action | Priorité | Statut |
|---|--------|----------|--------|
| A10 | **Restructurer avec Switch sur `Statut_Demande`** — Remplacer les ifs imbriqués par des branches claires basées sur le statut. Le flux positionne aussi `Resultat` quand la décision tombe. | Haute | À faire |
| A11 | **Ajouter génération docs avenant** — Nouveaux modèles Word pour les avenants, à déterminer avec le métier. | Haute | À spécifier |
| A12 | **Convention de nommage pour les modèles** — Remplacer les IDs de fichiers hardcodés par une recherche sur nom de fichier dans la bibliothèque. | Moyenne | À étudier |
| A13 | **Clarifier `supprimerWord`** — Variable initialisée à `false`, jamais passée à `true`. Comportement voulu ? Vestige ? Confirmer avec le métier. | Moyenne | À vérifier |
| A14 | **Évaluer séparation flux** — Un flux notifications + un flux génération docs ? Ou tout dans un seul ? Peser le pour/contre. | Basse | À étudier |

---

## Questions ouvertes (métier / RH)

| # | Question | Contexte |
|---|----------|----------|
| Q1 | **Qui sont les "admin RH" ?** — Aujourd'hui pas de moyen de les identifier. Proposition : RH = Super User, ou rôle dédié. À valider avec le métier. | Sécurité écran admin |
| Q2 | **Quels documents pour un avenant ?** — Convention modifiée ? Courrier avenant spécifique ? Cas favorable / défavorable / <70% à reproduire ? | Flux génération docs |
| Q3 | ~~Statuts post-validation détaillés~~ — **Validé par les RH** (spec existante). Reste à raccourcir les libellés pour la colonne SharePoint. | Colonne Statut_Demande |
| Q4 | **Variable `supprimerWord`** — Les fichiers Word intermédiaires doivent-ils être supprimés après conversion PDF ? Quel est le comportement attendu ? | Flux |
| Q5 | **Mise à jour des statuts RH** — Les statuts post-validation (En attente signature → Envoyé → Retourné signé) : écran dédié dans l'app, ou flux qui détecte les changements de colonnes dans SharePoint ? Un écran serait plus propre (UX unifiée, pas de saisie directe dans SP) mais c'est du dev en plus. | Colonne Statut_Demande |
| Q6 | **Étape intermédiaire avant signature élu ?** — Aujourd'hui on passe directement de docs générés à en attente signature. Y a-t-il une étape "En attente envoi élu" (avec une colonne Date_Envoi_Elu) entre les deux ? À valider avec les RH. | Colonne Statut_Demande |
| Q7 | **Courriers d'inéligibilité** — Est-ce qu'on garde la génération des courriers d'inéligibilité ? Aude voit avec Jessica (25/03). | Flux génération docs |
| Q8 | **Conservation des docs PDF/WORD** — Faut-il garder les deux formats ou seulement PDF ? Aude doit statuer. | Flux / SharePoint |
| Q9 | **Mise à disposition docs signés aux agents** — Ajouter les conventions signées sur les demandes pour que les agents puissent y accéder ? | App / SharePoint |
| Q10 | **Supprimer colonne `Outils`** — Plus utilisée ? À confirmer. | Nettoyage SP |
| Q11 | **Colonne `Observations`** — Garder ou non ? Utile mais usage flou. | Nettoyage SP |
| Q12 | **Cas d'usage écran admin (bouton modifier SP)** — Clarifier les usages : suppression demande (flux qui supprime aussi côté validation ?), réimpression convention, validation à la place d'un directeur, modification de champs. Définir le périmètre exact. | Écran admin |

---

## Annexe — Colonnes de suivi

Deux colonnes séparent le **cycle** (où on en est) du **résultat** (quelle issue).

### Colonne `Resultat` (Choix)

Positionné une seule fois quand la décision finale tombe, ne change plus ensuite.

| Valeur | Signifie |
|--------|----------|
| Favorable | Demande acceptée (N+1 et N+2 favorables) |
| Défavorable | Demande refusée par N+1 ou N+2 |
| Inéligible | Métier non télétravaillable |
| < 70% | Quotité de temps de travail insuffisante |

### Colonne `Statut_Demande` (Choix)

Avance au fil du cycle. Les libellés décrivent l'action en cours.

| Valeur | Positionné par | Signifie |
|--------|---------------|----------|
| Validation N+1 | App | Demande soumise, en attente avis manager |
| Validation N+2 | Flux | Manager a validé, en attente avis directeur |
| Rejetée | Flux | Demande refusée (par N+1 ou N+2, voir `Resultat`) |
| Signature élu | Flux | Docs générés, en attente signature de l'élu |
| Envoi agent | RH (manuel) | Signé, en attente d'envoi à l'agent |
| Retourné | RH (manuel) | Convention retournée signée par l'agent |
| Terminé | Flux ou RH | Cycle complet |

### Parcours favorable

```
Validation N+1              ← agent soumet
  → Validation N+2          ← N+1 favorable        → Resultat reste vide
    → Signature élu           ← N+2 favorable        → Resultat = Favorable
      → Envoi agent            ← RH : signé par l'élu
        → Retourné              ← RH : retourné par l'agent
          → Terminé              ← cycle complet
```

### Parcours défavorable / inéligible

```
Validation N+1
  → Rejetée → Terminé        ← N+1 défavorable      → Resultat = Défavorable

Validation N+1
  → Validation N+2
    → Rejetée → Terminé      ← N+2 défavorable      → Resultat = Défavorable

Rejetée → Terminé            ← inéligible            → Resultat = Inéligible
Rejetée → Terminé            ← quotité < 70%         → Resultat = < 70%
```

### Notes

- Pas de statut "Brouillon" — l'agent ne peut que soumettre directement
- `Resultat` est positionné par le flux dès que la décision est connue (N+1 rejette, ou N+2 statue, ou inéligibilité détectée)
- Parcours défavorable/inéligible : le flux génère les docs puis passe directement à "Terminé"
- Parcours favorable : le flux génère les docs puis passe à "Signature élu"
- Possibilité d'ajouter un statut intermédiaire avant "Signature élu" (voir Q6)
