# Bitcoin-COT-Reports

Suivi reproductible du **Commitment of Traders bitcoin** (CFTC, rapport *Legacy — Futures Only*, BITCOIN — CME, code 133741). Le projet confronte ce suivi à la façon dont Tom McClellan (*McClellan Market Report*, Daily Edition) lit ce rapport.

- **Suivi** : position nette des non-commerciaux, en contrats et en % de l'intérêt ouvert, variation hebdomadaire et son rang percentile dans l'historique. Deux événements sont signalés : le passage net short et la variation extrême.
- **Backtest** : rendement du bitcoin 4, 13 et 26 semaines après un passage net short (simple ou « marqué »), et après une variation extrême.
- **Confrontation** : ses six commentaires d'août-septembre 2026, face aux chiffres du rapport qu'il commentait.
- **Prime des futures** : écart entre les deux premiers contrats CME, annualisé, face au taux du Trésor à 3 mois. L'écart est ce que rapporte un arbitrage cash-and-carry : il aide à repérer les shorts qui peuvent n'être que des couvertures.
- **Graphique interactif** : prix du bitcoin, position nette de chaque catégorie de traders, prime des futures et taux à 3 mois ; chaque série s'affiche ou se masque d'un clic.

Conclusions et limites : [`docs/rapport.md`](docs/rapport.md).

## Démarrage

```bash
npm install          # uniquement TypeScript et @types/node (typage) — aucune dépendance d'exécution
npm run all          # suivi + backtest + confrontation + prime + graphique → output/
npm run chart        # graphique seul → output/graphique.html, à ouvrir dans un navigateur
npm test             # 48 tests
npm run typecheck    # code Node et script du navigateur
```

Node ≥ 22.18 exécute directement les fichiers `.ts` (type stripping). Sur un Node plus ancien : `npx tsx src/cli/track.ts`.

## Données

| Fichier | Contenu | Provenance |
|---|---|---|
| `data/cot_legacy_133741.csv` | OI et positions longues, courtes et spread des non-commerciaux, commerciaux et non-déclarants — **valeurs publiées uniquement** | voir `.meta.json` |
| `data/btc_usdt_daily.csv` | OHLC quotidien BTCUSDT (UTC) | voir `.meta.json` |
| `data/cme_btc_futures_daily.csv` | Clôtures quotidiennes des deux premiers contrats CME (`f1_close`, `f2_close`), par séance | voir `.meta.json` |
| `data/us_rates_daily.csv` | Rendements du Trésor américain à 3 mois et à 10 ans, % par an | voir `.meta.json` |
| `data/raw/tradingview/` | Réponses brutes ayant servi aux snapshots | TradingView via le serveur MCP tvremix |

Le snapshot initial (29/09/2026) vient des séries COT de TradingView : l'environnement de l'analyse n'avait pas accès à `cftc.gov`. Les deux identités CFTC (OI = somme des longs = somme des shorts) sont vérifiées sur chaque semaine.

Pour passer à la **source officielle** :

```bash
npm run fetch                                   # API CFTC 6dca-aqww + Binance ; affiche les écarts avec le snapshot
npm run fetch -- --skip-price                   # COT seulement
npm run fetch -- --cot-csv chemin/export.csv    # export CSV du site CFTC ou annual.txt des archives deacotAAAA.zip
npm run fetch -- --code 133742                  # Micro Bitcoin
```

`node scripts/snapshot-from-tradingview.ts` reconstruit les snapshots à partir des réponses brutes. Les futures CME et les taux n'ont pas encore de chemin officiel dans `npm run fetch` : aucune source gratuite des règlements CME historiques ; pour les taux, FRED (DGS3MO, DGS10) serait l'équivalent.

## Sorties (`output/`, régénérées par `npm run all`)

| Fichier | Contenu |
|---|---|
| `suivi.csv` | Une ligne par semaine. Colonnes CFTC brutes, puis colonnes **calculées préfixées `calc_`** |
| `signaux.md` | État de la dernière semaine et toutes les semaines signalées |
| `backtest.md`, `backtest_evenements.csv`, `backtest.json` | Résultats agrégés, détail par événement, données complètes |
| `comparaison.md` | Chaque édition McClellan face à son arrêté COT ; vérification de sa règle sur les commerciaux |
| `prime.md`, `prime.csv` | Prime des futures CME, taux à 3 mois et 10 ans, écarts ; lien avec les shorts non commerciaux ; passages net short selon l'écart du moment |
| `graphique.html` | Graphique interactif autonome (données et script embarqués, aucune dépendance) : période, unité (% de l'OI ou contrats), une série par clic, passages net short, éditions McClellan, prime des futures et taux à 3 mois, info-bulle, tableau |

## Conventions qui comptent

- **Dates.** Chaque semaine est datée au **mardi d'arrêté** des positions. La publication a lieu le vendredi (`calc_publication`). Dans le backtest, l'entrée se fait à la clôture du jour de publication, jamais au mardi. Les deux shutdowns (2018-2019 et 2025) sont traités :
  - date de publication réelle quand elle est documentée ;
  - sinon, exclusion de l'événement.
- **Pas de look-ahead.** Tout rang percentile ne compare une semaine qu'aux semaines antérieures (fenêtre expansive, au moins 52 variations). Un test vérifie que modifier le futur ne change aucun rang passé.
- **Aucun seuil de McClellan.** Il n'en publie aucun sur le bitcoin. Les queues « extrêmes » (`--tail`, 5 % par défaut), la fenêtre de « plage normale » et le centile de « net short marqué » sont **des paramètres de l'outil**. Le backtest les présente en grille.

```bash
npm run track -- --tail 0.10 --min-history 104
```

## Structure

```
src/
  cot/          lecture CFTC (Socrata, export CSV, annual.txt), TradingView, contrôles d'intégrité
  price/        Binance, CSV, rendements et pires baisses
  market/       futures CME (deux premiers contrats) et taux US : lecture, date de séance TradingView
  calendar/     publication (vendredi, shutdowns), échéances CME
  analysis/     suivi, événements, backtest, prime des futures
  mcclellan/    ses six éditions (citations littérales séparées des résumés), confrontation, règle des commerciaux
  report/       mise en forme française ; chart/ : graphique interactif (script navigateur en TypeScript,
                typé par tsconfig.client.json, types effacés à la génération)
  cli/          fetch, track, backtest, compare, carry, chart
scripts/        reconstruction des snapshots TradingView
test/           tests node:test et fixtures des trois formats CFTC
docs/rapport.md analyse rédigée
```
