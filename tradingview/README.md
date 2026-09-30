# Indicateurs TradingView

Deux indicateurs Pine Script (v5) qui reproduisent les panneaux du graphique du dépôt (`output/graphique.html`) sous un graphique du bitcoin dans TradingView.

| Fichier | Panneau reproduit | Séries (chacune se coche ou se décoche dans les paramètres) |
|---|---|---|
| [`cot-bitcoin-positions.pine`](cot-bitcoin-positions.pine) | Positions COT | Nets des non-commerciaux, commerciaux et non-déclarants (% de l'OI ou contrats) ; courts bruts des hedge funds (TFF, décochée par défaut) ; passages net short ; éditions McClellan |
| [`prime-futures-cme.pine`](prime-futures-cme.pine) | Prime des futures | Prime CME annualisée (2e contrat / 1er), taux US à 3 mois, écart ombré ; en option, l'écart en ligne et le 10 ans |

## Installation

1. Ouvrir un graphique du bitcoin en **quotidien** (par exemple `BINANCE:BTCUSDT` ou `CME:BTC1!`), en échelle logarithmique pour retrouver le panneau du prix.
2. Éditeur Pine → *Nouveau* → coller le contenu d'un fichier → *Enregistrer* → *Ajouter au graphique*. Recommencer avec le second.
3. Chaque indicateur s'affiche dans son propre panneau, sous le prix. Les séries se règlent dans *Paramètres → Entrées*.

Les séries COT sont gratuites sur TradingView. Les futures CME le sont en différé ; ce délai n'a pas d'effet sur une prime calculée à la clôture.

## Ce qu'il faut savoir

- **Pas compilés ici.** L'environnement de ce dépôt n'a pas de compilateur Pine. L'arithmétique de la prime (échéances, annualisation, médiane) a été portée en TypeScript et comparée au code du dépôt : 3 666 jours sans écart d'échéance, médianes identiques. La syntaxe Pine, elle, n'est vérifiée que par TradingView : signalez toute erreur affichée par l'éditeur.
- **LibraryCOT.** Les tickers du rapport Legacy sont construits par la bibliothèque officielle `TradingView/LibraryCOT/2` (`COTTickerid`), par exemple `COT:133741_F_NCP_L`. Celui des hedge funds (`COT3:133741_F_LMP_S`, rapport TFF) est écrit en clair : c'est le ticker vérifié contre les données TradingView, le libellé de cette métrique dans la bibliothèque n'ayant pas pu être confirmé. L'info-bulle du tableau affiche les tickers utilisés.
- **Dates.** TradingView place chaque rapport au mardi d'arrêté, comme le graphique du dépôt. L'option *Afficher chaque rapport à sa publication* le montre à partir du vendredi (graphiques quotidiens et intrajournaliers). Les retards des shutdowns (2018-2019, 2025) ne sont pas modélisés.
- **Contrat.** Le paramètre *Contrat CFTC* bascule sur le Micro Bitcoin (133742).
- **Prime.** Échéance = dernier vendredi du mois, jours fériés ignorés. Sur un graphique hebdomadaire ou plus long, chaque barre prend la dernière séance de la période, sans médiane.
- **Alertes.** Passage net short / net long des non-commerciaux ; prime qui passe sous ou au-dessus du taux à 3 mois. Aucun seuil de McClellan : il n'en publie pas.

## Valeurs de contrôle

Sur un graphique quotidien, sans l'option de publication, la barre du mardi d'arrêté doit afficher les mêmes valeurs que le dépôt, à l'arrondi près. Positions en % de l'OI (calculées à partir des valeurs publiées) ; prime = médiane des 5 séances CME jusqu'au mardi.

| Arrêté | Non-comm. | Comm. | Non-décl. | Hedge funds, courts (contrats) | Prime CME | Taux 3 mois | Écart |
|---|---:|---:|---:|---:|---:|---:|---:|
| 17/12/2024 | +0,40 % | −1,14 % | +0,73 % | 63,14 % (26 850) | 15,55 % | 4,36 % | +11,19 pt |
| 30/06/2026 | +20,56 % | −19,28 % | −1,28 % | 58,47 % (10 721) | 4,26 % | 3,83 % | +0,43 pt |
| 22/09/2026 | +12,35 % | −13,93 % | +1,58 % | 56,90 % (12 698) | 5,45 % | 4,11 % | +1,34 pt |

Passages net short : 21 depuis le 08/02/2022, le dernier au 23/12/2025 ; aucun avant 2022, les non-commerciaux étant nets courts toutes les semaines.
