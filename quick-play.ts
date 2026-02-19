import { jLeagueTeamMap } from './data/club-map-sorare-fotmob';

const cards = require('./json/actual-players-with-starting-scores.json');

const jLeagueCards = cards.filter((card: any) =>
  jLeagueTeamMap.includes(card.clubSlug),
);

const highestDiff = [];

for (const card of jLeagueCards) {
  const diff = card.FinalPredictedScore - card.averageScore10Played;
  highestDiff.push({
    slug: card.slug,
    diff,
  });
}
console.log(highestDiff.sort((a, b) => b.diff - a.diff));
