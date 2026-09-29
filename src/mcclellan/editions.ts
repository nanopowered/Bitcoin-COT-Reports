// Les six éditions du vendredi (McClellan Market Report, Daily Edition) où Tom McClellan commente le COT
// du bitcoin, août-septembre 2026. Trois niveaux de texte, à ne jamais confondre :
//   - `lecture`    : résumé en français de sa lecture du COT, rédigé par Cyril (paraphrase) ;
//   - `conclusion` : sa conclusion, citation littérale quand `conclusionLitterale` est vrai, sinon résumé ;
//   - `sens`       : orientation de la conclusion sur le prix du bitcoin, telle qu'on peut la déduire.
// L'édition du vendredi commente le rapport publié le jour même, arrêté au mardi précédent.

export interface Edition {
  /** Date de l'édition (vendredi), AAAA-MM-JJ. */
  edition: string;
  lecture: string;
  conclusion: string;
  conclusionLitterale: boolean;
  sens: 'haussier' | 'moins enthousiaste' | 'non précisé';
  /** Autres citations littérales de l'édition utiles à la vérification. */
  autresCitations?: string[];
}

export const EDITIONS: readonly Edition[] = [
  {
    edition: '2026-08-14',
    lecture: 'Non-commerciaux au plus gros net long de l’histoire de la série',
    conclusion: 'They are committed to the idea that Bitcoin prices are headed higher',
    conclusionLitterale: true,
    sens: 'haussier',
  },
  {
    edition: '2026-08-21',
    lecture: 'Les commerciaux couvrent un peu après s’être trompés',
    conclusion: 'Confirme que le contre-indicateur, ce sont eux',
    conclusionLitterale: false,
    sens: 'non précisé',
    autresCitations: ['au début de la série, les commerciaux étaient « juste non fiables », puis « more reliably wrong »'],
  },
  {
    edition: '2026-09-04',
    lecture: 'Débouclage massif en une semaine, retour vers le neutre',
    conclusion:
      'Something is telling these traders that they need to get out of their longs quickly… So I am less excited now about Bitcoin’s prospects than I was 3 weeks ago',
    conclusionLitterale: true,
    sens: 'moins enthousiaste',
  },
  {
    edition: '2026-09-11',
    lecture: 'Reconstruction légère du net long',
    conclusion: 'There still should be more uptrend yet to come',
    conclusionLitterale: true,
    sens: 'haussier',
  },
  {
    edition: '2026-09-18',
    lecture: 'Reconstruction de l’essentiel de la position en deux semaines',
    conclusion: '…implying that there should still be more upside movement coming',
    conclusionLitterale: true,
    sens: 'haussier',
  },
  {
    edition: '2026-09-25',
    lecture: 'Après deux grosses séances de hausse, ils ajoutent encore au lieu d’alléger',
    conclusion: 'That says there should be more rise coming for Bitcoin prices',
    conclusionLitterale: true,
    sens: 'haussier',
  },
];
