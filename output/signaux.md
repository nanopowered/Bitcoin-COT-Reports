# Suivi COT bitcoin — CME 133741 (Legacy, futures seuls)

Données COT : TradingView (séries COT CFTC Legacy Futures Only) via tvremix get_ohlcv, intervalle 1D. Dernier arrêté : **22/09/2026** (publié le 25/09/2026).

Toutes les valeurs ci-dessous sauf l'OI et les positions brutes sont **calculées** (colonnes `calc_` de `suivi.csv`).
Rangs percentiles : semaines antérieures uniquement (fenêtre expansive), au moins 52 variations passées.
Seuil « extrême » = queue de 5,0 % de chaque côté : **paramètre de l'outil, pas un seuil de McClellan**.

## Dernière semaine

| Mesure | Valeur |
| --- | --- |
| Intérêt ouvert (publié) | 22 315 |
| Non-commerciaux long / short (publié) | 17 658 / 14 902 |
| Net non-commerciaux (calculé) | +2 756 contrats |
| Net non-commerciaux en % de l’OI (calculé) | +12,35 % |
| Variation hebdo du net (calculé) | +288 contrats · +0,47 pt d’OI |
| Rang de cette variation dans l’historique (calculé) | 54,5e centile |
| Rang du niveau (% OI) dans l’historique (calculé) | 96,8e centile |
| Net commerciaux en % de l’OI (calculé) | −13,93 % |
| Échéance CME dans la semaine | non |
| Signal | aucun |

## Semaines signalées (66)

| Arrêté | Événement | Net NC | % OI | Δ contrats | Δ pt OI | Rang Δ | Échéance CME |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 23/04/2019 | débouclage extrême | −1 063 | −24,65 | −357 | −8,32 | 1,9e centile |  |
| 24/12/2019 | débouclage extrême | −1 328 | −37,50 | −152 | −6,88 | 2,3e centile |  |
| 31/12/2019 | reconstruction extrême | −1 029 | −32,30 | +299 | +5,21 | 97,8e centile | 27/12/2019 |
| 07/01/2020 | reconstruction extrême + ⚠ contrats en sens inverse (effet OI) | −1 435 | −26,57 | −406 | +5,72 | 97,8e centile |  |
| 11/02/2020 | reconstruction extrême + ⚠ contrats en sens inverse (effet OI) | −1 680 | −27,51 | −209 | +6,17 | 98,9e centile |  |
| 18/02/2020 | reconstruction extrême | −1 408 | −21,79 | +272 | +5,73 | 96,9e centile |  |
| 03/03/2020 | débouclage extrême | −1 582 | −32,71 | −416 | −12,00 | 0,0e centile | 28/02/2020 |
| 10/03/2020 | reconstruction extrême | −1 046 | −23,95 | +536 | +8,76 | 99,0e centile |  |
| 07/04/2020 | débouclage extrême | −1 410 | −25,88 | −705 | −8,02 | 2,9e centile |  |
| 25/08/2020 | reconstruction extrême | −2 157 | −18,57 | +1 393 | +5,99 | 97,6e centile |  |
| 10/11/2020 | reconstruction extrême | −2 296 | −20,30 | +780 | +6,98 | 98,5e centile |  |
| 16/03/2021 | débouclage extrême | −2 652 | −28,41 | −739 | −6,63 | 3,3e centile |  |
| 18/05/2021 | reconstruction extrême | −959 | −10,47 | +979 | +13,00 | 100,0e centile |  |
| 25/05/2021 | débouclage extrême | −1 672 | −18,80 | −713 | −8,33 | 1,2e centile |  |
| 17/08/2021 | reconstruction extrême | −726 | −9,86 | +378 | +6,45 | 97,7e centile |  |
| 19/10/2021 | débouclage extrême | −2 846 | −20,92 | −1 420 | −7,86 | 2,7e centile |  |
| 02/11/2021 | reconstruction extrême | −1 612 | −11,93 | +2 800 | +14,53 | 100,0e centile | 29/10/2021 |
| 23/11/2021 | reconstruction extrême | −160 | −1,11 | +1 318 | +9,71 | 98,9e centile |  |
| 30/11/2021 | débouclage extrême | −1 691 | −12,81 | −1 531 | −11,70 | 0,5e centile | 26/11/2021 |
| 07/12/2021 | reconstruction extrême | −908 | −6,86 | +783 | +5,96 | 95,3e centile |  |
| 01/02/2022 | retour net long | +141 | +1,42 | +175 | +1,71 | 70,7e centile | 28/01/2022 |
| 08/02/2022 | passage net short | −319 | −3,23 | −460 | −4,64 | 10,6e centile |  |
| 01/03/2022 | retour net long | +80 | +0,80 | +363 | +3,37 | 83,2e centile | 25/02/2022 |
| 29/03/2022 | passage net short | −271 | −2,25 | −271 | −2,25 | 22,8e centile | 25/03/2022 |
| 12/04/2022 | retour net long | +167 | +1,57 | +411 | +3,72 | 85,1e centile |  |
| 19/04/2022 | passage net short | −194 | −1,72 | −361 | −3,29 | 13,4e centile |  |
| 26/04/2022 | retour net long | +412 | +3,85 | +606 | +5,57 | 93,3e centile |  |
| 12/07/2022 | passage net short | −171 | −1,27 | −591 | −4,43 | 10,9e centile |  |
| 23/08/2022 | retour net long + reconstruction extrême | +964 | +7,25 | +1 057 | +8,00 | 97,8e centile |  |
| 13/09/2022 | débouclage extrême | +126 | +0,96 | −1 196 | −7,66 | 3,0e centile |  |
| 04/10/2022 | passage net short + débouclage extrême | −32 | −0,22 | −1 056 | −7,40 | 3,4e centile | 30/09/2022 |
| 11/10/2022 | retour net long | +857 | +5,44 | +889 | +5,66 | 94,0e centile |  |
| 01/11/2022 | passage net short | −452 | −3,71 | −475 | −3,86 | 13,5e centile | 28/10/2022 |
| 08/11/2022 | retour net long | +18 | +0,12 | +470 | +3,83 | 85,7e centile |  |
| 13/12/2022 | passage net short | −40 | −0,29 | −107 | −0,71 | 39,9e centile |  |
| 20/12/2022 | retour net long | +317 | +2,18 | +357 | +2,46 | 77,0e centile |  |
| 10/01/2023 | passage net short + débouclage extrême | −594 | −3,99 | −983 | −6,67 | 4,0e centile |  |
| 07/03/2023 | retour net long | +41 | +0,32 | +640 | +4,27 | 91,0e centile |  |
| 14/03/2023 | passage net short | −102 | −0,76 | −143 | −1,08 | 36,7e centile |  |
| 02/05/2023 | retour net long | +168 | +1,34 | +461 | +3,43 | 84,4e centile | 28/04/2023 |
| 27/06/2023 | passage net short + débouclage extrême | −2 094 | −11,12 | −2 491 | −13,65 | 0,0e centile |  |
| 22/08/2023 | retour net long + reconstruction extrême | +1 515 | +8,78 | +2 227 | +13,39 | 99,6e centile |  |
| 24/10/2023 | passage net short | −454 | −2,31 | −781 | −4,28 | 12,2e centile |  |
| 31/10/2023 | débouclage extrême | −1 746 | −8,91 | −1 292 | −6,60 | 4,5e centile | 27/10/2023 |
| 02/04/2024 | retour net long | +160 | +0,54 | +1 235 | +3,98 | 88,1e centile | 29/03/2024 |
| 09/04/2024 | passage net short | −153 | −0,53 | −313 | −1,06 | 36,2e centile |  |
| 23/04/2024 | retour net long | 0 | 0,00 | +363 | +1,23 | 62,7e centile |  |
| 07/05/2024 | passage net short | −783 | −2,99 | −789 | −3,02 | 17,1e centile |  |
| 06/08/2024 | retour net long | +538 | +1,95 | +1 540 | +5,46 | 94,5e centile |  |
| 20/08/2024 | passage net short | −243 | −0,82 | −638 | −2,24 | 23,3e centile |  |
| 03/09/2024 | retour net long | +108 | +0,40 | +274 | +0,96 | 59,2e centile | 30/08/2024 |
| 10/09/2024 | passage net short | −353 | −1,25 | −461 | −1,66 | 27,8e centile |  |
| 17/12/2024 | retour net long | +171 | +0,40 | +891 | +2,32 | 77,0e centile |  |
| 24/12/2024 | passage net short | −129 | −0,35 | −300 | −0,75 | 38,7e centile |  |
| 07/01/2025 | retour net long | +1 190 | +3,39 | +1 509 | +4,33 | 92,6e centile |  |
| 11/02/2025 | passage net short | −367 | −1,11 | −1 153 | −3,50 | 12,9e centile |  |
| 25/02/2025 | retour net long | +204 | +0,64 | +571 | +1,72 | 71,2e centile |  |
| 22/04/2025 | passage net short | −806 | −2,86 | −1 392 | −5,02 | 7,1e centile |  |
| 16/09/2025 | retour net long | +20 | +0,07 | +488 | +1,81 | 72,4e centile |  |
| 30/09/2025 | passage net short | −108 | −0,40 | −187 | −0,69 | 39,6e centile | 26/09/2025 |
| 10/11/2025 | retour net long | +128 | +0,46 | +403 | +1,48 | 68,6e centile |  |
| 18/11/2025 | passage net short | −312 | −1,15 | −440 | −1,62 | 27,8e centile |  |
| 02/12/2025 | retour net long | +567 | +2,33 | +650 | +2,65 | 81,7e centile | 28/11/2025 |
| 23/12/2025 | passage net short | −479 | −2,18 | −585 | −2,61 | 17,2e centile |  |
| 13/01/2026 | retour net long | +69 | +0,29 | +803 | +3,60 | 88,1e centile |  |
| 18/08/2026 | débouclage extrême | +2 736 | +12,57 | −1 129 | −5,67 | 4,4e centile |  |
