# Backtest — la règle de sommet de McClellan sur le COT bitcoin

*Fichier généré par `npm run backtest` — ne pas éditer à la main.*
Données COT : TradingView (séries COT CFTC Legacy Futures Only) via tvremix get_ohlcv, intervalle 1D. Prix : TradingView BINANCE:BTCUSDT 1D via tvremix get_ohlcv, clôtures quotidiennes UTC.

## Conventions

- **Événement daté au mardi d'arrêté** des positions (état du marché décrit par le rapport).
- **Entrée à la clôture du jour de publication** (vendredi, 15 h 30 à New York, soit avant la clôture UTC) : première clôture où l'information était publique. Semaines de shutdown : date réelle quand la CFTC l'a documentée (24/12/2018 → 01/02/2019, 30/09/2025 → 19/11/2025), sinon semaine exclue (24/12/2018–26/02/2019, 30/09/2025–16/12/2025).
- Variante « entrée mardi » calculée **uniquement pour mesurer le biais de look-ahead** (section 3).
- Horizons : 4, 13 et 26 semaines (28, 91, 182 jours calendaires). « Pire baisse » = plus bas des clôtures de la fenêtre rapporté à l'entrée.
- **Base** = toutes les semaines de la même période, entrée au vendredi prévu (même en cas de shutdown : le prix existe, seule la publication manquait). Pour le passage net short : depuis la première semaine où les non-commerciaux ont été nets longs (01/02/2022) ; avant, aucun passage n'était possible.
- **p unilat.** : test de permutation (20 000 tirages, graine fixe) sur la médiane, dans le sens annoncé par McClellan (plus bas que la base pour un signal baissier). Il suppose des semaines échangeables : les fenêtres qui se chevauchent et les événements groupés le rendent **optimiste**.
- **n (indép.)** : nombre d'événements dont les fenêtres ne se chevauchent pas.
- « Marqué » n'est **pas chiffré par McClellan**. Les variantes « marqué » sont une traduction de « crossed over to the net short side in a big way » : première semaine d'un épisode net short (ouvert par un passage net long → net short) où le niveau en % de l'OI tombe dans le q-ième centile inférieur des N semaines précédentes (sa règle 3 : juger le niveau contre la plage normale). Les paramètres N et q sont les miens ; ils sont montrés en grille, pas choisis.

## Contexte indispensable

- Les non-commerciaux sont nets courts **327 semaines sur 442** (74 %).
- De 10/04/2018 à 25/01/2022, ils sont nets courts **toutes les semaines** (199 sur 199), jusqu'à −37,5 % de l'OI. Sur cette période, le bitcoin passe de 6 844 $ à 36 958 $, avec un sommet de clôture à 67 526 $. Un net short « marqué » y est l'état permanent : la règle ne peut rien y dire.
- Base sur tout l'échantillon (entrée à la publication) : 4 sem. +1,0 % (n = 438) · 13 sem. +4,2 % (n = 429) · 26 sem. +14,0 % (n = 416).

## 1. Passage net short — entrée à la publication

| Variante | Horizon | n (indép.) | Médiane év. | Médiane base | % hausse év. / base | Moyenne év. / base | Pire baisse méd. év. / base | p (sens McClellan) | p (sens inverse) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Passage net short (tout croisement) | 4 sem. | 20 (18) | +3,0 % | +0,6 % | 55 % / 53 % | +0,8 % / +2,2 % | −3,1 % / −5,7 % | 0,816 | 0,184 |
|  | 13 sem. | 20 (11) | −5,9 % | +0,9 % | 45 % / 52 % | +3,0 % / +7,0 % | −16,7 % / −12,6 % | 0,184 | 0,817 |
|  | 26 sem. | 20 (6) | +18,8 % | +17,0 % | 60 % / 64 % | +13,6 % / +18,4 % | −19,1 % / −17,1 % | 0,540 | 0,461 |
| Net short « marqué » (52 sem., 25e centile) | 4 sem. | 6 (6) | +3,3 % | +0,6 % | 50 % / 53 % | +0,6 % / +2,2 % | −1,9 % / −5,7 % | 0,673 | 0,327 |
|  | 13 sem. | 6 (5) | +14,4 % | +0,9 % | 83 % / 52 % | +17,5 % / +7,0 % | −5,6 % / −12,6 % | 0,782 | 0,218 |
|  | 26 sem. | 6 (3) | +38,8 % | +17,0 % | 83 % / 64 % | +36,8 % / +18,4 % | −5,6 % / −17,1 % | 0,849 | 0,151 |
| Net short « marqué » (52 sem., 10e centile) | 4 sem. | 5 (5) | +5,7 % | +0,6 % | 80 % / 53 % | +4,6 % / +2,2 % | −1,4 % / −5,7 % | 0,776 | 0,232 |
|  | 13 sem. | 5 (4) | +13,3 % | +0,9 % | 80 % / 52 % | +17,5 % / +7,0 % | −2,0 % / −12,6 % | 0,767 | 0,239 |
|  | 26 sem. | 5 (3) | +38,1 % | +17,0 % | 100 % / 64 % | +34,3 % / +18,4 % | −2,0 % / −17,1 % | 0,787 | 0,220 |
| Net short « marqué » (156 sem., 25e centile) | 4 sem. | 2 (2) | +9,6 % | +0,6 % | 100 % / 53 % | +9,6 % / +2,2 % | −2,8 % / −5,7 % | 0,789 | 0,212 |
|  | 13 sem. | 2 (2) | +37,5 % | +0,9 % | 100 % / 52 % | +37,5 % / +7,0 % | −2,8 % / −12,6 % | 0,919 | 0,081 |
|  | 26 sem. | 2 (2) | +24,1 % | +17,0 % | 100 % / 64 % | +24,1 % / +18,4 % | −2,8 % / −17,1 % | 0,601 | 0,399 |
| Net short « marqué » (156 sem., 10e centile) | 4 sem. | 1 (1) | +3,5 % | +0,6 % | 100 % / 53 % | +3,5 % / +2,2 % | −3,2 % / −5,7 % | 0,623 | 0,381 |
|  | 13 sem. | 1 (1) | +6,1 % | +0,9 % | 100 % / 52 % | +6,1 % / +7,0 % | −3,2 % / −12,6 % | 0,549 | 0,456 |
|  | 26 sem. | 1 (1) | −14,3 % | +17,0 % | 0 % / 64 % | −14,3 % / +18,4 % | −18,7 % / −17,1 % | 0,264 | 0,740 |

## 2. Détail des passages net short (tout croisement)

Exclus pour publication retardée : 18/11/2025.

| Arrêté | Entrée (publication) | Net NC | % OI | Clôture entrée | +4 sem. | +13 sem. | +26 sem. | Pire baisse 26 sem. | +13 sem. si entrée mardi |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 08/02/2022 | 11/02/2022 | −319 | −3,23 | 42 374 | −8,6 % | −30,9 % | −42,4 % | −55,2 % | −29,6 % |
| 29/03/2022 | 01/04/2022 | −271 | −2,25 | 46 283 | −16,6 % | −58,3 % | −58,0 % | −60,1 % | −57,2 % |
| 19/04/2022 | 22/04/2022 | −194 | −1,72 | 39 709 | −26,5 % | −42,9 % | −51,7 % | −53,5 % | −43,6 % |
| 12/07/2022 | 15/07/2022 | −171 | −1,27 | 20 830 | +17,2 % | −7,9 % | −4,3 % | −24,2 % | −1,4 % |
| 04/10/2022 | 07/10/2022 | −32 | −0,22 | 19 530 | +8,3 % | −13,2 % | +42,9 % | −19,2 % | −18,0 % |
| 01/11/2022 | 04/11/2022 | −452 | −3,71 | 21 149 | −19,2 % | +10,8 % | +39,5 % | −25,4 % | +12,9 % |
| 13/12/2022 | 16/12/2022 | −40 | −0,29 | 16 632 | +19,8 % | +64,7 % | +58,4 % | −1,2 % | +38,8 % |
| 10/01/2023 | 13/01/2023 | −594 | −3,99 | 19 930 | +8,5 % | +52,9 % | +52,1 % | 0,0 % | +73,2 % |
| 14/03/2023 | 17/03/2023 | −102 | −0,76 | 27 395 | +11,2 % | −3,8 % | −2,9 % | −8,3 % | +5,1 % |
| 27/06/2023 | 30/06/2023 | −2 094 | −11,12 | 30 472 | −3,8 % | −11,7 % | +38,1 % | −17,4 % | −14,6 % |
| 24/10/2023 | 27/10/2023 | −454 | −2,31 | 33 892 | +11,3 % | +23,4 % | +88,2 % | 0,0 % | +17,6 % |
| 09/04/2024 | 12/04/2024 | −153 | −0,53 | 67 117 | −9,4 % | −13,7 % | −6,8 % | −19,6 % | −16,0 % |
| 07/05/2024 | 10/05/2024 | −783 | −2,99 | 60 800 | +14,1 % | +0,1 % | +25,8 % | −11,2 % | −10,1 % |
| 20/08/2024 | 23/08/2024 | −243 | −0,82 | 64 037 | −1,3 % | +54,4 % | +50,2 % | −15,7 % | +56,4 % |
| 10/09/2024 | 13/09/2024 | −353 | −1,25 | 60 498 | +3,4 % | +67,6 % | +38,8 % | −3,8 % | +67,6 % |
| 24/12/2024 | 27/12/2024 | −129 | −0,35 | 94 299 | +11,2 % | −10,5 % | +13,5 % | −19,1 % | −11,4 % |
| 11/02/2025 | 14/02/2025 | −367 | −1,11 | 97 500 | −13,9 % | +6,1 % | +20,4 % | −21,7 % | +8,7 % |
| 22/04/2025 | 25/04/2025 | −806 | −2,86 | 94 639 | +13,4 % | +24,3 % | +17,3 % | −0,9 % | +28,4 % |
| 30/09/2025 | 19/11/2025 | −108 | −0,40 | 91 555 | −5,8 % | −27,4 % | −15,3 % | −31,3 % | −22,4 % |
| 18/11/2025 | publication retardée (exclue) | −312 | −1,15 | — | — | — | — | — | −27,4 % |
| 23/12/2025 | 26/12/2025 | −479 | −2,18 | 87 370 | +2,6 % | −24,0 % | −31,2 % | −31,6 % | −19,4 % |

### Événements des variantes « marqué »

**Net short « marqué » (52 sem., 25e centile)**

| Arrêté | Entrée (publication) | Net NC | % OI | Clôture entrée | +4 sem. | +13 sem. | +26 sem. | Pire baisse 26 sem. | +13 sem. si entrée mardi |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 01/11/2022 | 04/11/2022 | −452 | −3,71 | 21 149 | −19,2 % | +10,8 % | +39,5 % | −25,4 % | +12,9 % |
| 10/01/2023 | 13/01/2023 | −594 | −3,99 | 19 930 | +8,5 % | +52,9 % | +52,1 % | 0,0 % | +73,2 % |
| 21/03/2023 | 24/03/2023 | −621 | −4,42 | 27 454 | −0,7 % | +11,8 % | −3,2 % | −8,5 % | +0,7 % |
| 27/06/2023 | 30/06/2023 | −2 094 | −11,12 | 30 472 | −3,8 % | −11,7 % | +38,1 % | −17,4 % | −14,6 % |
| 31/10/2023 | 03/11/2023 | −1 746 | −8,91 | 34 717 | +11,4 % | +24,4 % | +81,1 % | 0,0 % | +24,0 % |
| 29/04/2025 | 02/05/2025 | −1 231 | −4,57 | 96 887 | +7,3 % | +16,9 % | +13,1 % | −2,7 % | +25,1 % |

**Net short « marqué » (52 sem., 10e centile)**

| Arrêté | Entrée (publication) | Net NC | % OI | Clôture entrée | +4 sem. | +13 sem. | +26 sem. | Pire baisse 26 sem. | +13 sem. si entrée mardi |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10/01/2023 | 13/01/2023 | −594 | −3,99 | 19 930 | +8,5 % | +52,9 % | +52,1 % | 0,0 % | +73,2 % |
| 04/04/2023 | 07/04/2023 | −615 | −4,60 | 27 906 | +5,7 % | +8,7 % | +0,1 % | −10,0 % | +9,2 % |
| 27/06/2023 | 30/06/2023 | −2 094 | −11,12 | 30 472 | −3,8 % | −11,7 % | +38,1 % | −17,4 % | −14,6 % |
| 31/10/2023 | 03/11/2023 | −1 746 | −8,91 | 34 717 | +11,4 % | +24,4 % | +81,1 % | 0,0 % | +24,0 % |
| 06/05/2025 | 09/05/2025 | −1 781 | −6,37 | 102 972 | +1,3 % | +13,3 % | +0,4 % | −2,0 % | +17,9 % |

**Net short « marqué » (156 sem., 25e centile)**

| Arrêté | Entrée (publication) | Net NC | % OI | Clôture entrée | +4 sem. | +13 sem. | +26 sem. | Pire baisse 26 sem. | +13 sem. si entrée mardi |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 01/10/2024 | 04/10/2024 | −1 684 | −5,90 | 62 086 | +11,9 % | +58,1 % | +35,1 % | −2,8 % | +53,9 % |
| 29/04/2025 | 02/05/2025 | −1 231 | −4,57 | 96 887 | +7,3 % | +16,9 % | +13,1 % | −2,7 % | +25,1 % |

**Net short « marqué » (156 sem., 10e centile)**

| Arrêté | Entrée (publication) | Net NC | % OI | Clôture entrée | +4 sem. | +13 sem. | +26 sem. | Pire baisse 26 sem. | +13 sem. si entrée mardi |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 03/06/2025 | 06/06/2025 | −2 312 | −7,77 | 104 288 | +3,5 % | +6,1 % | −14,3 % | −18,7 % | +5,6 % |

## 3. Biais de look-ahead : entrée au mardi d'arrêté vs au vendredi de publication

Calculé sur les mêmes événements des deux côtés. Un écart négatif signifie que l'entrée au mardi — impossible en temps réel — rend la règle plus baissière qu'elle ne l'était pour quelqu'un qui lisait le rapport le vendredi.

| Variante | Horizon | n | Médiane entrée vendredi (publication) | Médiane entrée mardi (look-ahead) | Écart |
| --- | --- | ---: | ---: | ---: | ---: |
| Passage net short (tout croisement) | 4 sem. | 20 | +3,0 % | +0,9 % | −2,1 pt |
|  | 13 sem. | 20 | −5,9 % | −5,7 % | +0,1 pt |
|  | 26 sem. | 20 | +18,8 % | +13,6 % | −5,2 pt |
| Net short « marqué » (52 sem., 25e centile) | 4 sem. | 6 | +3,3 % | +8,6 % | +5,3 pt |
|  | 13 sem. | 6 | +14,4 % | +18,4 % | +4,1 pt |
|  | 26 sem. | 6 | +38,8 % | +39,2 % | +0,4 pt |
| Net short « marqué » (52 sem., 10e centile) | 4 sem. | 5 | +5,7 % | +8,8 % | +3,1 pt |
|  | 13 sem. | 5 | +13,3 % | +17,9 % | +4,6 pt |
|  | 26 sem. | 5 | +38,1 % | +38,5 % | +0,4 pt |
| Net short « marqué » (156 sem., 25e centile) | 4 sem. | 2 | +9,6 % | +17,6 % | +8,0 pt |
|  | 13 sem. | 2 | +37,5 % | +39,5 % | +2,0 pt |
|  | 26 sem. | 2 | +24,1 % | +29,9 % | +5,8 pt |
| Net short « marqué » (156 sem., 10e centile) | 4 sem. | 1 | +3,5 % | +0,3 % | −3,3 pt |
|  | 13 sem. | 1 | +6,1 % | +5,6 % | −0,5 pt |
|  | 26 sem. | 1 | −14,3 % | −13,4 % | +1,0 pt |

## 4. Règle de vitesse (analyse complémentaire)

Même protocole, événements = semaines où la variation du net (en points d'OI) tombe dans la queue basse (débouclage, lu comme baissier par McClellan le 04/09) ou haute (reconstruction, lue comme haussière le 11 et le 18/09). Base : toutes les semaines ayant au moins 52 variations d'historique.

| Variante | Horizon | n (indép.) | Médiane év. | Médiane base | % hausse év. / base | Moyenne év. / base | Pire baisse méd. év. / base | p (sens McClellan) | p (sens inverse) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Débouclage extrême (queue basse 5 %) | 4 sem. | 14 (13) | +4,5 % | +1,2 % | 57 % / 55 % | +6,0 % / +4,4 % | −4,1 % / −6,4 % | 0,745 | 0,255 |
|  | 13 sem. | 13 (9) | −11,7 % | +6,0 % | 46 % / 56 % | +6,3 % / +14,8 % | −19,2 % / −13,1 % | 0,066 | 0,936 |
|  | 26 sem. | 13 (6) | +38,3 % | +15,2 % | 77 % / 63 % | +28,5 % / +33,4 % | −19,2 % / −18,2 % | 0,907 | 0,097 |
| Reconstruction extrême (queue haute 5 %) | 4 sem. | 14 (11) | −4,4 % | +1,2 % | 36 % / 55 % | −3,5 % / +4,4 % | −10,1 % / −6,4 % | 0,946 | 0,054 |
|  | 13 sem. | 14 (7) | −6,8 % | +6,0 % | 43 % / 56 % | +19,2 % / +14,8 % | −23,8 % / −13,1 % | 0,862 | 0,138 |
|  | 26 sem. | 14 (6) | +16,9 % | +15,2 % | 71 % / 63 % | +48,8 % / +33,4 % | −31,8 % / −18,2 % | 0,471 | 0,530 |
| Débouclage extrême (queue basse 10 %) | 4 sem. | 34 (26) | +6,0 % | +1,2 % | 62 % / 55 % | +6,1 % / +4,4 % | −4,2 % / −6,4 % | 0,928 | 0,072 |
|  | 13 sem. | 33 (15) | +9,5 % | +6,0 % | 58 % / 56 % | +18,3 % / +14,8 % | −16,5 % / −13,1 % | 0,723 | 0,289 |
|  | 26 sem. | 32 (9) | +40,2 % | +15,2 % | 75 % / 63 % | +64,0 % / +33,4 % | −16,9 % / −18,2 % | 0,988 | 0,012 |
| Reconstruction extrême (queue haute 10 %) | 4 sem. | 31 (25) | −2,4 % | +1,2 % | 45 % / 55 % | +0,3 % / +4,4 % | −7,3 % / −6,4 % | 0,944 | 0,059 |
|  | 13 sem. | 30 (14) | −2,6 % | +6,0 % | 47 % / 56 % | +11,0 % / +14,8 % | −17,6 % / −13,1 % | 0,848 | 0,153 |
|  | 26 sem. | 30 (9) | +23,7 % | +15,2 % | 70 % / 63 % | +38,5 % / +33,4 % | −22,5 % / −18,2 % | 0,251 | 0,750 |
