import leagues from './data/competitions-map-sorare-fotmob';
import getMatchesByDate from './functions/get-matches-by-date';
import { getNextSo5Gameweek } from './functions/sorare/get-next-gameweek';
import getCards from './functions/mongo/get-cards';
import getMatchOdds, {
  addPlayerSlugToOverwriteOdds,
} from './functions/fotmob/get-match-odds';
import { teamMap } from './data/club-map-sorare-fotmob';
import getPredictedScore from './functions/get-predicted-score';
import fs from 'fs';

const run = async () => {
  const { gameweekSlug, gameweekStart, gameweekEnd } =
    await getNextSo5Gameweek();

  console.log(gameweekSlug);

  const finalLeagueIds = Object.values(leagues).map(
    (league) => league.leagueId,
  );

  const matches = await getMatchesByDate(
    finalLeagueIds,
    gameweekStart,
    gameweekEnd,
  );

  const cards = await getCards();

  const teamOdds: { [key: number]: number } = {};
  const noOddsMatches: Record<number, { home: number; away: number }> = {};

  for (const match of matches) {
    const odds = await getMatchOdds(match.id);
    teamOdds[match.home] = odds.percentage.home;
    teamOdds[match.away] = odds.percentage.away;
    if (odds.hadNoOdds) {
      noOddsMatches[match.id] = { home: match.home, away: match.away };
    }
  }

  const predictedCards: any[] = [];

  for (const card of cards) {
    const { averageScore15, averageScore5, averageScore10Played, clubSlug } =
      card;

    const teamId = teamMap[clubSlug as keyof typeof teamMap];
    const percentage = teamOdds[teamId];
    for (const [matchId, teams] of Object.entries(noOddsMatches)) {
      if (teams.home === teamId || teams.away === teamId) {
        addPlayerSlugToOverwriteOdds(Number(matchId), card.slug);
      }
    }

    const predictedScore = await getPredictedScore(
      averageScore5,
      averageScore15,
      averageScore10Played,
      percentage,
    );
    predictedCards.push({ ...card, predictedScore });
  }

  fs.writeFileSync(
    'json/predicted-cards.json',
    JSON.stringify(
      predictedCards.sort((a, b) => b.predictedScore - a.predictedScore),
      null,
      2,
    ),
    'utf8',
  );
  console.log('Done');
};

run();
