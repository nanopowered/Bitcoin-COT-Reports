# McClellan et le COT bitcoin : suivi, backtest, confrontation

*Rapport du 29/09/2026, section 6 (prime des futures) ajoutée le 30/09/2026. Dernier COT disponible : arrêté au 22/09/2026, publié le 25/09. Prix : clôtures quotidiennes UTC BTCUSDT jusqu'au 28/09/2026.*

Conventions de lecture :
- **« Il écrit »** : les citations littérales de McClellan, ou ton résumé de sa lecture (c'est précisé à chaque fois).
- **« La donnée »** : les chiffres CFTC.
- Tout chiffre qui n'est ni une position brute publiée ni l'intérêt ouvert (OI) est **calculé** : net, % de l'OI, variations, rangs, rendements. Dans les CSV, ces colonnes portent le préfixe `calc_`.
- Les rangs percentiles comparent une valeur à toutes les semaines **antérieures** seulement.

---

## En bref

1. **État actuel (arrêté au 22/09).**
   - Chiffres : net non-commerciaux **+2 756 contrats, +12,35 % de l'OI**. Ce niveau se classe au 96,8e centile de son historique.
   - Dernière semaine : +288 contrats, une semaine ordinaire (54,5e centile).
   - Durée : les non-commerciaux sont **nets longs depuis 37 semaines d'affilée** (depuis le 13/01/2026).
   - Conséquence : sa condition de sortie (passage net short) n'est pas remplie. Aucun signal.
2. **Backtest de sa règle de sommet : pas de preuve.**
   - Passages net short simples (20 exploitables, 2022-2025) : médiane à 13 semaines de −5,9 %, contre +0,9 % pour la base. C'est dans son sens, mais p = 0,18.
   - À 4 et 26 semaines, aucun écart.
   - Les variantes « net short marqué » font **mieux** que la base (13 semaines : +6 % à +38 %), sur 1 à 6 événements.
   - Sur les 27 tests réalisés dans le sens de sa lecture (règle de sommet et règle de vitesse, trois horizons chacune), aucun n'atteint p < 0,05.
3. **La règle ne pouvait rien dire avant 2022.**
   - Du 10/04/2018 au 25/01/2022, les non-commerciaux sont nets courts **199 semaines sur 199**, jusqu'à −37,5 % de l'OI.
   - Pendant ce temps, le bitcoin passe de 6 844 $ à un sommet de clôture de 67 526 $.
   - « Net short en grand » est l'état permanent de la série à cette époque, pas un signal.
4. **« Tant qu'ils sont nets acheteurs, rester haussier » a coûté cher en 2026.**
   - Les non-commerciaux sont nets longs depuis le rapport publié le 16/01/2026 (bitcoin à 95 551 $).
   - Le bitcoin tombe ensuite à **58 625 $ le 30/06/2026 (−38,6 %)**.
   - Cette même semaine, les non-commerciaux atteignaient leur **record en % de l'OI (+20,56 %)** : ils ont bien acheté le creux, mais en étant longs depuis 5 mois.
5. **Ses commentaires d'août-septembre suivent bien le sens des chiffres. Le détail cloche souvent :**
   - Il réagit au débouclage **deux semaines trop tard**. La semaine au 18/08 était déjà la plus extrême en points d'OI (4,4e centile), mais le 21/08 il parle des commerciaux.
   - Il le décrit comme une sortie des longs, alors que dans la semaine commentée les longs sont stables (−52) et ce sont les shorts qui montent (+1 194).
   - Il qualifie de « légère » une reconstruction qui se classe au 94,7e centile en contrats.
   - La reconstruction suivante, lue comme une reprise de conviction, vient d'un rachat de shorts (−1 800) pendant que les longs **baissent** (−856).
6. **Ses deux commentaires de conviction (14/08 et 25/09) sont exacts.** Record de positionnement à 1 % près le 14/08 ; ajout net le 25/09, modeste (+288).
7. **Le bilan de ses appels reste haussier et, jusqu'ici, gagnant** (+32,4 % du 14/08 au 28/09). C'est un seul épisode : il ne valide pas la méthode.
8. **La prime des futures éclaire les shorts non commerciaux** (section 6, tout calculé).
   - L'écart entre la prime CME annualisée et le taux à 3 mois est ce que rapporte un arbitrage cash-and-carry : +8,4 points en médiane en 2020, +1,4 en 2026.
   - Plus il est large, plus les shorts non commerciaux pèsent dans l'OI (corrélation de rang +0,45 sur 2018-2026) : un net short peut n'être que la jambe couverte d'un arbitrage.
   - Les passages net short à écart faible ont été suivis d'une médiane de −10,6 % à 13 semaines, contre +3,1 % à écart large. Non significatif (p = 0,21, 10 + 10 passages).

---

## 1. Données

| | Source | Période | Contrôles |
|---|---|---|---|
| COT | CFTC Legacy Futures Only, BITCOIN — CME, code 133741, via les séries COT de TradingView (`COT:133741_F_OI`, `_NCP_L/S/SPREAD`, `_CP_L/S`, `_NRP_L/S`) | 442 semaines, 10/04/2018 → 22/09/2026 | Les deux identités CFTC (OI = somme des longs = somme des shorts) tiennent sur les 442 semaines ; aucune semaine manquante |
| Prix | BINANCE:BTCUSDT, bougies quotidiennes UTC | 11/03/2018 → 28/09/2026 | Aucun jour manquant ; bougie du 29/09 (incomplète) écartée |
| Futures CME | CME:BTC1! et CME:BTC2! (deux premiers contrats, séries continues TradingView), clôtures quotidiennes | 18/12/2017 → 29/09/2026 | Date de séance déduite de l'horodatage TradingView, qui a changé le 29/05/2026 ; contrôlée contre le spot Binance |
| Taux US | TVC:US03MY (bon à 3 mois) et TVC:US10Y (10 ans), % par an | 01/07/2016 → 29/09/2026 | Séance du 30/09 (en cours) écartée |

**Pourquoi TradingView et pas la CFTC directement ?**
- L'environnement cloud de cette analyse n'avait pas accès à `cftc.gov`, `publicreporting.cftc.gov` ni aux API de prix (politique réseau).
- Les séries COT de TradingView reprennent les chiffres CFTC. Les réponses brutes sont versionnées dans `data/raw/tradingview/`.
- Sur ta machine, `npm run fetch` télécharge la source officielle (API Socrata `6dca-aqww`) et **affiche les écarts semaine par semaine** avec ce snapshot avant de l'écraser. C'est le contrôle croisé qu'il reste à faire.

**Calendrier.**
- La série est datée au **mardi d'arrêté** des positions ; cinq semaines fériées sont arrêtées au lundi (24/12/2018, 31/12/2018, 21/12/2020, 03/07/2023, 10/11/2025).
- Publication : le vendredi à 15 h 30 à New York, sauf pendant deux shutdowns :
  - le rapport du 24/12/2018 est sorti le 01/02/2019 ;
  - celui du 30/09/2025 est sorti le 19/11/2025, et le rattrapage s'est terminé le 29/12/2025.
- L'alignement « édition du vendredi = rapport arrêté le mardi de la même semaine » est confirmé par le texte lui-même :
  - le « retour vers le neutre » du 04/09 correspond à +703 contrats au 01/09, contre +1 949 au 25/08 ;
  - les « deux grosses séances » du 25/09 (18/09 et 21/09) sont bien antérieures au 22/09.

**Définitions (calculées).**
- Net NC = longs NC − shorts NC.
- % de l'OI = net / OI × 100.
- Δ = variation d'une semaine sur l'autre, en contrats et en **points d'OI**.
- Rang percentile « mid-rank » : part des variations antérieures inférieures, plus la moitié des égales. Fenêtre expansive, au moins 52 variations d'historique.
- Le signal de vitesse porte sur les points d'OI, parce que l'OI a été multiplié par dix depuis 2018 ; le rang en contrats est fourni à côté.
- Seuil « extrême » = queues de 5 % par défaut. **C'est un paramètre de l'outil**, modifiable (`--tail`) : McClellan n'en publie aucun.

---

## 2. Le suivi reproductible

`npm run track` produit :
- `output/suivi.csv` : une ligne par semaine, positions CFTC brutes plus 24 colonnes `calc_` ;
- `output/signaux.md` : l'état courant et les semaines signalées.

Deux événements sont signalés, ceux qu'il surveille :
- le **passage net short** (semaine précédente ≥ 0, semaine courante < 0 ; aucun paramètre) ;
- la **variation hebdomadaire extrême** (rang de Δ ≤ 5 % ou ≥ 95 % de son historique).

Un avertissement s'affiche quand la variation en % de l'OI et la variation en contrats vont en sens contraire : un bond de l'OI peut produire une « reconstruction » en % pendant que le net baisse en contrats (ex. 07/01/2020).

Dernière semaine (arrêtée au 22/09/2026, publiée le 25/09) :

| Mesure | Valeur |
|---|---|
| OI / longs NC / shorts NC (publiés) | 22 315 / 17 658 / 14 902 |
| Net NC (calculé) | +2 756 contrats · +12,35 % de l'OI · 96,8e centile du niveau |
| Δ semaine (calculé) | +288 contrats · +0,47 pt · 54,5e centile |
| Net commerciaux (calculé) | −13,93 % de l'OI |
| Signal | aucun |

---

## 3. Backtest : que fait le bitcoin après un passage des non-commerciaux en net short ?

**Protocole** (`npm run backtest`, détail complet dans `output/backtest.md`) :
- **Date de l'événement** : le mardi d'arrêté, puisque c'est l'état des positions.
- **Entrée à la clôture du jour de publication** (vendredi) : c'est la première clôture où l'information était publique. Entrer au mardi serait un look-ahead de trois jours ; cette variante n'est calculée que pour mesurer ce biais.
- **Pendant les shutdowns** : on utilise la date de publication réelle quand elle est documentée. Sinon, l'événement est exclu (18/11/2025).
- **Horizons** : 4, 13 et 26 semaines.
- **Base** : toutes les semaines depuis la première semaine nette longue (01/02/2022). Avant cette date, aucun passage n'était possible.
- **p** : test de permutation unilatéral sur la médiane, dans le sens de sa lecture. Il est **optimiste** : fenêtres chevauchantes et événements groupés.

**« Marqué » n'est pas chiffré par McClellan.** Je l'ai traduit ainsi : c'est la première semaine d'un épisode net short, ouvert par un passage net long → net short, où le niveau (% de l'OI) tombe dans le q-ième centile inférieur des N semaines précédentes. C'est sa règle 3 : juger le niveau contre sa plage normale. N et q sont mes paramètres ; je les montre en grille, sans en choisir un.

| Variante | n | 4 sem. : médiane év. / base | 13 sem. | 26 sem. | p à 13 sem. |
|---|---:|---|---|---|---:|
| Passage net short (tout croisement) | 20 | +3,0 % / +0,6 % | **−5,9 % / +0,9 %** | +18,8 % / +17,0 % | 0,18 |
| Marqué, 52 sem., 25e centile | 6 | +3,3 % / +0,6 % | +14,4 % / +0,9 % | +38,8 % / +17,0 % | 0,78 |
| Marqué, 52 sem., 10e centile | 5 | +5,7 % / +0,6 % | +13,3 % / +0,9 % | +38,1 % / +17,0 % | 0,77 |
| Marqué, 156 sem., 25e centile | 2 | +9,6 % / +0,6 % | +37,5 % / +0,9 % | +24,1 % / +17,0 % | 0,92 |
| Marqué, 156 sem., 10e centile | 1 | +3,5 % / +0,6 % | +6,1 % / +0,9 % | −14,3 % / +17,0 % | 0,55 |

**Lecture.**
- **Croisements simples : tout se joue à 13 semaines.** C'est le seul horizon où les croisements font moins bien que la base : 45 % de hausses contre 52 %, pire baisse médiane de −16,7 % contre −12,6 %. L'écart n'est pas significatif (p = 0,18) et repose sur 11 fenêtres indépendantes.
- **Croisements simples : trois événements portent l'écart.** Ils sont groupés en février-avril 2022, en plein marché baissier (−31 %, −58 %, −43 % à 13 semaines).
- **Aucun effet à 4 ni à 26 semaines.**
- **Les variantes « marqué » vont à l'inverse de sa règle.** Les passages net short les plus profonds, relativement à l'année précédente, ont été suivis de rendements **supérieurs** à la base. Dans la variante 52 semaines / 25e centile, 5 événements sur 6 précèdent une hausse à 26 semaines, dont +52,1 % (10/01/2023) et +81,1 % (31/10/2023). Le seul cas baissier (arrêté au 03/06/2025, −14,3 % à 26 semaines) est un événement isolé.

**Le seul « bon » signal n'était pas exploitable.**
- Le passage net short arrêté au 30/09/2025 précède d'une semaine le sommet historique (124 659 $ le 06/10/2025).
- Il n'a été publié que le **19/11/2025**, à 91 555 $, à cause du shutdown.
- En le datant au vendredi prévu (03/10), on lui attribue −45 % à 26 semaines ; en temps réel, le chiffre est −15,3 %.

**Le look-ahead du mardi ne change rien de systématique.** Sur le même ensemble d'événements, l'écart entre entrée au mardi et entrée au vendredi va de −5,2 à +8,0 points selon la variante et l'horizon, sans direction constante. Ce qui déforme vraiment un backtest naïf ici, c'est d'ignorer les **publications retardées**.

**Règle de vitesse (complément)** : mêmes conventions, événements = variations hebdomadaires dans les queues de 5 % ou 10 %.

| Événement | 4 sem. : médiane év. / base | 13 sem. | 26 sem. |
|---|---|---|---|
| Débouclage extrême, queue 5 % (n = 14) | +4,5 % / +1,2 % | −11,7 % / +6,0 % (p = 0,066) | +38,3 % / +15,2 % |
| Débouclage extrême, queue 10 % (n = 34) | +6,0 % / +1,2 % | +9,5 % / +6,0 % | +40,2 % / +15,2 % |
| Reconstruction extrême, queue 5 % (n = 14) | **−4,4 % / +1,2 %** | −6,8 % / +6,0 % | +16,9 % / +15,2 % |
| Reconstruction extrême, queue 10 % (n = 31) | **−2,4 % / +1,2 %** | −2,6 % / +6,0 % | +23,7 % / +15,2 % |

Ce tableau ne soutient pas sa règle de vitesse :
- **Le débouclage n'est pas baissier.** Le seul chiffre qui va dans son sens (13 semaines, queue de 5 %) s'inverse avec la queue de 10 % et à 26 semaines.
- **Les reconstructions extrêmes, qu'il lit comme haussières** (11 et 18/09), ont plutôt été suivies d'un mois **plus faible** que la base : p ≈ 0,05 dans le sens inverse du sien.
- **Le vrai résultat est l'absence de signal fiable.** Vu le nombre de variantes testées, rien ne survit à une correction pour tests multiples : ni son sens, ni l'inverse.

---

## 4. Ses commentaires, semaine par semaine

Chaque édition du vendredi commente le rapport arrêté le mardi précédent. Les chiffres complets sont dans `output/comparaison.md`.

| Édition | Il écrit | La donnée (arrêté du mardi) | Verdict |
|---|---|---|---|
| **14/08** | Résumé : non-commerciaux au plus gros net long de l'histoire. « They are committed to the idea that Bitcoin prices are headed higher » | +3 865 contrats (+18,24 % de l'OI) au 11/08 : **2e sur 436** en contrats (record +3 904 le 28/07), **5e** en % de l'OI (record +20,56 % le 30/06). Semaine plate (+113). | **Juste à 1 % près** en contrats. En % de l'OI, le pic était passé depuis six semaines. |
| **21/08** | Résumé : les commerciaux couvrent **un peu** après s'être trompés ; ils sont le contre-indicateur. | Commerciaux : **+1 107 contrats (+5,53 pt), 99,1e centile** de leur historique (shorts −936). La semaine va jusqu'au 18/08 (BTC +1,8 %). La hausse de +21 % arrive **après** (19-21/08). Non-commerciaux : −1 129 contrats (−5,67 pt, **4,4e centile**), longs −814. | **Faux sur l'ampleur et sur l'ordre.** Ce n'est pas « un peu » : le rachat a précédé la hausse au lieu d'y réagir. Surtout, sa règle de vitesse aurait dû se déclencher dès cette semaine : c'était le débouclage le plus extrême des trois en points d'OI. |
| *28/08* | *Pas d'édition bitcoin* | −787 contrats (10,3e centile ; 4,8e en contrats). Longs −788, shorts −1 : pure liquidation de longs. | Semaine non commentée. |
| **04/09** | Résumé : débouclage massif **en une semaine**, retour vers le neutre. « Something is telling these traders that they need to get out of their longs quickly… So I am less excited now about Bitcoin's prospects than I was 3 weeks ago » | −1 246 contrats (−5,20 pt ; **5,9e centile**, 1,6e en contrats). Net +703 (+3,57 %). Longs **−52**, shorts **+1 194**. C'est la troisième semaine de baisse : −3 162 contrats (−14,7 pt) depuis le 11/08, dont 61 % **avant** la semaine commentée. Échéance CME le 28/08 : l'OI recule de 2 519 contrats, presque entièrement des spreads (−2 576), pas le net. | **Niveau et vitesse justes, récit faux.** Le retour vers le neutre est exact. Mais ce n'est pas « en une semaine » : c'est la fin d'une baisse de trois semaines. Et cette semaine-là, ce ne sont pas des longs qui sortent, ce sont des shorts qui entrent. L'échéance n'explique pas le mouvement. |
| **11/09** | Résumé : reconstruction **légère** du net long. « There still should be more uptrend yet to come » | +821 contrats (+3,66 pt) : **88,8e centile, 94,7e en contrats**. De vrais achats (longs +1 070). Les commerciaux vendent fort (−984, 1,8e centile). | **Direction juste, ampleur minimisée.** C'est une semaine du décile supérieur. Elle ne rattrape que 26 % de la baisse de trois semaines, ce qui explique sans doute le mot « légère ». |
| **18/09** | Résumé : reconstruction de **l'essentiel** de la position en deux semaines. « …implying that there should still be more upside movement coming » | +944 contrats (94,8e centile ; 97,5e en contrats) ; +1 765 en deux semaines. Cela représente **56 %** de la baisse de trois semaines, 142 % de la semaine qu'il avait commentée le 04/09, et un niveau égal à 64 % de celui du 11/08. **Longs −856, shorts −1 800** ; BTC −3,6 % sur la semaine. | **« L'essentiel » dépend de la référence.** Surtout, ce n'est pas une reconstruction de positions longues, c'est un rachat de shorts : les shorts ajoutés fin août (+1 443 en deux semaines) ressortent en une semaine. |
| **25/09** | Résumé : après deux grosses séances de hausse, ils ajoutent encore au lieu d'alléger. « That says there should be more rise coming for Bitcoin prices » | Les deux séances existent : 18/09 **+5,8 %** et 21/09 **+6,7 %** (BTC +14,0 % sur la semaine). Net +288 (+0,47 pt, 54,5e centile), longs +914, shorts +626. | **Juste, mais la semaine est ordinaire.** Ils n'allègent pas, mais n'ajoutent presque rien en net. Sa conclusion repose en fait sur le niveau (96,8e centile), pas sur la vitesse. |

**Ce qui ressort de la séquence.**
- **Il applique sa règle de vitesse avec retard.** La semaine au 18/08 (4,4e centile) et celle au 25/08 (10,3e) sont passées sans commentaire de vitesse. Il réagit le 04/09, quand le net avait fini de baisser : le 01/09 est le point bas de l'épisode.
- **L'aller-retour que tu avais repéré est dans la donnée elle-même.** Les shorts non commerciaux montent de +1 443 contrats en deux semaines (25/08 → 08/09), puis baissent de −1 800 en une semaine (→ 15/09).
  - Cela ressemble à une position de court terme autour des échéances d'août et de septembre, plus qu'à un changement de conviction.
  - Sa lecture « moins enthousiaste » puis « encore de la hausse » suit ce bruit à la semaine près.
- **Tout reste cohérent avec sa règle de sortie.** Le net n'est jamais passé sous zéro (plus bas : +703 le 01/09) ; sa règle de sortie ne s'est donc jamais déclenchée, et il est resté haussier sur le fond.
- **Le prix a suivi, sur un seul épisode :**
  - bitcoin +32,4 % entre le 14/08 (63 044 $) et le 28/09 (83 500 $) ;
  - depuis son « moins enthousiaste » du 04/09 (79 661 $), +4,8 %.

---

## 5. Sa règle 2 : les commerciaux « more reliably wrong » ?

Il affirme que les commerciaux sont nets longs aux sommets et nets courts aux creux, en % de l'OI. Voici leurs positions aux pivots majeurs, identifiés **après coup** (plus haut ou plus bas des clôtures d'arrêté sur ± 26 semaines).

| Pivot | Net commerciaux (% OI, calculé) | Conforme ? |
|---|---:|---|
| Sommet 13/04/2021 | +3,52 | oui |
| Creux 20/07/2021 | **+5,99** | non (nets longs au creux) |
| Sommet 09/11/2021 | +1,61 | oui |
| Creux 22/11/2022 | −5,50 | oui |
| Sommet 12/03/2024 | +0,19 | à peine (quasi nul) |
| Sommet 07/10/2025 | +3,02 | oui |

Avant 2021, les commerciaux sont quasi absents : aucun contrat long commercial 113 semaines sur 143. Cela rejoint son « juste non fiables ».

**Les pivots lui donnent plutôt raison** : 5 sur 6 dans le bon sens, dont un à +0,19 %, c'est-à-dire nul. Les positions sont minces : 0,2 % à 6 % de l'OI. Sur l'ensemble des semaines, en revanche, la corrélation de rang entre leur net et le rendement suivant est de **+0,14 à 13 semaines** et de −0,02 à 26 semaines ; depuis 2021, +0,11 et −0,08. Un contre-indicateur fiable donnerait une corrélation clairement négative. Aux grands pivots, l'histoire tient ; semaine après semaine, rien ne la confirme.

---

## 6. La prime des futures : quand les shorts peuvent être de l'arbitrage

Détail et tableaux : `output/prime.md` (`npm run carry`). Tous les chiffres de cette section sont **calculés**, sauf les taux du Trésor.

**Ce qu'on mesure.**
- Prime = (2e contrat ÷ 1er − 1) × 365 ÷ jours entre leurs échéances, en % par an, médiane des 5 séances CME jusqu'au mardi d'arrêté.
- C'est ce qu'encaisse, d'une échéance à la suivante, un fonds qui achète le bitcoin au comptant (ou un ETF) et vend le future : l'arbitrage cash-and-carry. Son short est une couverture, pas un pari à la baisse.
- Deux contrats du même marché, clôturés au même instant : pas de décalage horaire avec le spot. Une seconde mesure (1er contrat contre spot Binance) donne des médianes annuelles proches (2020 : 8,9 % contre 8,7 % ; 2025 : 7,9 % contre 8,0 %).

**Face à quel taux ?** Le taux à 3 mois, pas le 10 ans.
- L'arbitrage dure un à deux mois et se finance à court terme. Son coût d'opportunité est le placement monétaire, pas une obligation à 10 ans.
- Une même prime ne rapporte pas la même chose selon les taux. 2020 : prime 8,9 %, taux 0,1 %, écart +8,4 points. 2023 : prime 8,3 %, mais taux 5,3 %, écart +2,9 points seulement.
- Les données départagent mal les deux taux. Corrélation de rang entre la part des shorts non commerciaux dans l'OI et la mesure : prime brute +0,38, écart au 3 mois +0,45, écart au 10 ans +0,45 sur 2018-2026 ; depuis 2022, +0,51, +0,57 et +0,52. En variations sur 13 semaines, les liens sont faibles (+0,12 à +0,36) et reposent sur 15 à 33 paires.

**Quel écart rend l'arbitrage intéressant ?** Aucun seuil observable.
- L'écart ne compte pas les frais (ETF, CME, courtage), la marge immobilisée sur le future, le surcoût de financement d'un fonds par rapport au Trésor, ni le risque d'appel de marge si le prix bondit. Le seuil de rentabilité est donc au-dessus de zéro et propre à chaque acteur.
- Ce que montrent les données : les shorts non commerciaux pèsent le plus lourd les années d'écart large (2020 : 87,9 % de l'OI, écart +8,4 points ; 2024 : 82,8 %, +5,6 points) et le moins en 2026 (67,9 %, +1,4 point). Au 22/09/2026 : prime 5,4 %, taux 4,1 %, écart +1,3 point.

**Passages net short et écart du moment.**
- Les 20 passages exploitables depuis 2022, coupés en deux à l'écart médian (+2,8 points).
- Écart faible : médiane −10,6 % à 13 semaines. Écart large : +3,1 %.
- C'est dans le sens de l'intuition (un net short sans arbitrage rentable dit davantage), mais **non significatif** (p = 0,21). Le groupe à écart faible mêle deux cas opposés : le début du marché baissier de 2022 (−31 % à −58 %) et la capitulation de fin 2022, prime négative, suivie de +53 % à +65 %.

**Lecture pour McClellan.** Ce qu'il écrit : « Tops tend to come once these traders have crossed over to the net short side in a big way ». Ce que la donnée ajoute : un net short « en grand » pendant que l'écart est large peut n'être que de l'arbitrage. C'est le cas de 2019-2021 (écart de +3 à +8 points en médiane annuelle, nets courts toute la période, bitcoin en forte hausse). En 2018, à l'inverse, l'écart est négatif (−2,1 points en médiane) : ces shorts ne pouvaient pas être un arbitrage rentable, et le bitcoin a baissé (6 844 $ le 10/04, 3 703 $ le 31/12). Un seul épisode de chaque côté : c'est une piste, pas une règle. Le graphique affiche la prime et le taux sous les positions pour le vérifier semaine par semaine.

---

## 7. Limites

- **Échantillon.**
  - 20 passages net short exploitables, dont 11 fenêtres de 13 semaines indépendantes, et 1 à 6 événements « marqués ».
  - Quatre épisodes de commentaires ne valent pas une statistique. Même les p-valeurs affichées surestiment la preuve : chevauchements, grappes, plus de 25 tests.
- **Rupture de régime.** Avant 2022, la position nette des non-commerciaux reflète surtout un portage structurel : les grands spéculateurs sont vendeurs de futures, en face de petits porteurs acheteurs. Elle ne reflète pas une opinion directionnelle. Toute règle calibrée sur l'historique complet mélange deux marchés.
- **Seuils.**
  - « Marqué », « extrême », la fenêtre de 52 semaines, les queues de 5 % : **aucun de ces seuils n'est de McClellan**.
  - Ils sont exposés en paramètres et en grilles pour qu'aucune conclusion ne dépende d'un choix caché.
- **Données.**
  - Snapshot TradingView en attendant le contrôle croisé CFTC (`npm run fetch`).
  - Contrat standard 133741 seulement : ni le Micro (133742), ni le rapport TFF.
  - Prix spot Binance, pas le future CME. Clôture à minuit UTC, contre environ 21-22 h UTC pour l'arrêté CME du mardi.
  - Prime : contrats continus TradingView (date de roulement non documentée, clôture peut-être pas au règlement). En 2018-2019, le pas de cotation de 5 $ vaut à lui seul 1 à 2 points de prime annualisée.
- **Calendrier.** Les décalages de publication d'un à trois jours lors des semaines fériées ne sont pas modélisés. Seuls les deux shutdowns le sont.

## 8. Reproduire

```bash
npm install            # TypeScript et @types/node, pour le typage uniquement
npm run fetch          # source officielle CFTC + Binance, avec contrôle croisé du snapshot
npm run all            # suivi.csv, signaux.md, backtest.md, comparaison.md, prime.md, graphique.html
npm test               # 48 tests, dont non-régression sur les valeurs publiées
```

Node ≥ 22.18 exécute le TypeScript directement : aucune étape de build.

## Annexe : contrôle des chiffres de contexte

Sur les clôtures Binance, arrêtées au 28/09 :
- Tes écarts se retrouvent à la date de fin près : +31,5 % depuis le 03/08 (63 520 $), +9,3 % depuis le 17/09, −3,6 % depuis le sommet de clôture du 21/09 (86 620 $). Tes chiffres (+30,8 %, +8,7 %, −4,1 %) correspondent à un prix d'environ 83 080 $ au moment de ta mesure.
- **Une seule divergence** : le 28/09, le bitcoin fait **−1,15 %** en journée UTC, pas −0,71 %. L'écart vient probablement de la fenêtre horaire utilisée (séance de l'or contre journée UTC). C'est le même piège que l'horodatage de TVC:GOLD : à garder en tête pour toute comparaison jour par jour.
