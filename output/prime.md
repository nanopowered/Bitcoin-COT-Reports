# Prime des futures CME et arbitrage cash-and-carry

Toutes les valeurs de ce fichier sont **calculées**, sauf les taux du Trésor (valeurs de la source).

## Méthode

- **Prime** : (F2 / F1 − 1) × 365 / jours entre les deux échéances × 100, en % par an. F1 et F2 sont les clôtures du même jour des deux premiers contrats CME ; échéance = dernier vendredi du mois. C'est ce qu'encaisse, d'une échéance à la suivante, un vendeur de futures couvert au comptant.
- **Semaine** : médiane des 5 dernières séances jusqu'au mardi d'arrêté inclus ; aucune séance postérieure (pas de look-ahead). Taux : dernière cotation au plus tard le mardi.
- **Excès** : prime − rendement du bon du Trésor à 3 mois. L'arbitrage dure un à deux mois et se finance à court terme : c'est le bon taux de référence. Le 10 ans est donné pour comparaison.
- **Ce que l'excès ne compte pas** : frais (ETF, CME, courtage), marge à immobiliser sur la jambe future, surcoût de financement d'un fonds par rapport au Trésor, risque d'appel de marge si le prix monte brutalement. Le seuil de rentabilité réel est donc au-dessus de zéro, propre à chaque acteur, et n'est pas observable ici.
- Sources : TradingView CME:BTC1! et CME:BTC2! (contrats continus, 1D) via tvremix get_ohlcv ; TradingView TVC:US03MY et TVC:US10Y (1D) via tvremix get_ohlcv.

## Dernière semaine

Arrêté du 22/09/2026 : prime 5,4 %, taux à 3 mois 4,1 %, excès +1,3 pt. Shorts non commerciaux : 66,8 % de l'OI.

## Médianes annuelles

| Année | Semaines | Prime | Taux 3 mois | Taux 10 ans | Excès / 3 mois | Excès / 10 ans | Shorts NC, % de l’OI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2018 | 39 | 0,0 % | 2,1 % | 3,0 % | −2,1 pt | −3,0 pt | 81,5 % |
| 2019 | 52 | 5,0 % | 2,2 % | 2,1 % | +3,3 pt | +3,2 pt | 82,5 % |
| 2020 | 52 | 8,9 % | 0,1 % | 0,7 % | +8,4 pt | +7,8 pt | 87,9 % |
| 2021 | 52 | 5,9 % | 0,0 % | 1,5 % | +5,9 pt | +4,4 pt | 79,1 % |
| 2022 | 52 | 1,5 % | 1,8 % | 3,0 % | −0,2 pt | −1,6 pt | 76,2 % |
| 2023 | 52 | 8,3 % | 5,3 % | 3,9 % | +2,9 pt | +4,1 pt | 79,8 % |
| 2024 | 53 | 10,8 % | 5,4 % | 4,3 % | +5,6 pt | +6,7 pt | 82,8 % |
| 2025 | 52 | 7,9 % | 4,3 % | 4,3 % | +3,7 pt | +3,6 pt | 83,8 % |
| 2026 | 38 | 5,1 % | 3,7 % | 4,4 % | +1,4 pt | +0,7 pt | 67,9 % |

Une même prime ne rapporte pas la même chose selon les taux. En 2020, prime médiane 8,9 %, taux à 3 mois 0,1 %, excès +8,4 pt. En 2023, prime 8,3 %, mais taux 5,3 % : excès +2,9 pt seulement.

## Quel taux retenir ?

Corrélation de rang (Spearman) entre la part des shorts non commerciaux dans l'OI et chaque mesure de la prime. Entre parenthèses : nombre de semaines, ou de paires de variations.

### Toute la série (10/04/2018 – 22/09/2026)

| Mesure | Niveaux | Variations sur 13 semaines |
| --- | ---: | ---: |
| Prime brute | +0,38 (442) | +0,34 (33) |
| Prime − taux à 3 mois | +0,45 (442) | +0,31 (33) |
| Prime − taux à 10 ans | +0,45 (442) | +0,36 (33) |

### Nets courts en permanence (10/04/2018 – 25/01/2022)

| Mesure | Niveaux | Variations sur 13 semaines |
| --- | ---: | ---: |
| Prime brute | +0,38 (199) | +0,36 (15) |
| Prime − taux à 3 mois | +0,36 (199) | +0,31 (15) |
| Prime − taux à 10 ans | +0,39 (199) | +0,31 (15) |

### Oscillation autour de zéro (01/02/2022 – 22/09/2026)

| Mesure | Niveaux | Variations sur 13 semaines |
| --- | ---: | ---: |
| Prime brute | +0,51 (243) | +0,16 (18) |
| Prime − taux à 3 mois | +0,57 (243) | +0,12 (18) |
| Prime − taux à 10 ans | +0,52 (243) | +0,19 (18) |

- Les niveaux hebdomadaires sont très autocorrélés : ces coefficients décrivent, ils ne testent rien.
- Les variations sur 13 semaines ne se chevauchent pas, mais elles sont peu nombreuses.
- Avant 2022, taux courts et longs sont bas et bougent ensemble : les trois mesures sont presque confondues.

## Passages net short et prime du moment

Mêmes conventions que le backtest : entrée à la clôture du jour de publication, rendement à 13 semaines.

| Arrêté | Publication | Prime | Taux 3 mois | Excès | Bitcoin 13 sem. après |
| --- | --- | ---: | ---: | ---: | ---: |
| 08/02/2022 | 11/02/2022 | 2,7 % | 0,3 % | +2,4 pt | −30,9 % |
| 29/03/2022 | 01/04/2022 | 4,0 % | 0,6 % | +3,4 pt | −58,3 % |
| 19/04/2022 | 22/04/2022 | 0,5 % | 0,9 % | −0,4 pt | −42,9 % |
| 12/07/2022 | 15/07/2022 | 1,9 % | 2,2 % | −0,3 pt | −7,9 % |
| 04/10/2022 | 07/10/2022 | −0,7 % | 3,4 % | −4,1 pt | −13,2 % |
| 01/11/2022 | 04/11/2022 | 0,3 % | 4,2 % | −3,8 pt | +10,8 % |
| 13/12/2022 | 16/12/2022 | −7,0 % | 4,4 % | −11,4 pt | +64,7 % |
| 10/01/2023 | 13/01/2023 | −5,8 % | 4,7 % | −10,5 pt | +52,9 % |
| 14/03/2023 | 17/03/2023 | 2,9 % | 4,8 % | −1,9 pt | −3,8 % |
| 27/06/2023 | 30/06/2023 | 9,8 % | 5,3 % | +4,5 pt | −11,7 % |
| 24/10/2023 | 27/10/2023 | 9,2 % | 5,5 % | +3,7 pt | +23,4 % |
| 09/04/2024 | 12/04/2024 | 11,9 % | 5,4 % | +6,6 pt | −13,7 % |
| 07/05/2024 | 10/05/2024 | 10,5 % | 5,4 % | +5,1 pt | +0,1 % |
| 20/08/2024 | 23/08/2024 | 10,8 % | 5,2 % | +5,6 pt | +54,4 % |
| 10/09/2024 | 13/09/2024 | 10,0 % | 5,0 % | +5,0 pt | +67,6 % |
| 24/12/2024 | 27/12/2024 | 10,8 % | 4,3 % | +6,4 pt | −10,5 % |
| 11/02/2025 | 14/02/2025 | 10,6 % | 4,3 % | +6,3 pt | +6,1 % |
| 22/04/2025 | 25/04/2025 | 7,5 % | 4,3 % | +3,2 pt | +24,3 % |
| 30/09/2025 | 19/11/2025 | 6,2 % | 3,9 % | +2,3 pt | −27,4 % |
| 18/11/2025 | retardée (exclue) | 6,8 % | 3,9 % | +2,9 pt | — |
| 23/12/2025 | 26/12/2025 | 5,4 % | 3,6 % | +1,8 pt | −24,0 % |

- Excès inférieur ou égal à +2,8 pt (10 passages) : médiane −10,6 % à 13 semaines.
- Excès supérieur (10 passages) : médiane +3,1 %.
- p unilatérale (permutation, 20 000 tirages) que le groupe à excès faible fasse moins bien qu'une moitié tirée au hasard : 0,210.
- Les fenêtres de 13 semaines se chevauchent et les deux groupes sont petits : c'est une description, pas une règle.

## Limites

- **Contrats continus TradingView.** La date de roulement n'est pas documentée : on suppose que le 1er contrat est celui de la prochaine échéance. Autour des échéances, quelques séances peuvent être mal appariées ; la médiane sur 5 séances l'amortit.
- **Clôtures.** TradingView ne dit pas s'il s'agit du règlement. Le 2e contrat traite peu : sa clôture peut dater de quelques heures.
- **Pas de cotation.** Le contrat cote par pas de 5 $. Quand le bitcoin valait 3 500 à 7 000 $ (2018-2019), un seul pas représentait 1 à 2 points de prime annualisée : les premières années sont imprécises.
- **Motif.** Le COT ne dit pas pourquoi un fonds est vendeur. Le lien avec la prime est une corrélation, compatible avec l'arbitrage, pas une preuve.
