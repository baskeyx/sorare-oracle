import getMatchOdds from './functions/fotmob/get-match-odds';
import getMatchesByDate from './functions/get-matches-by-date';
import { getNextSo5Gameweek } from './functions/get-next-gameweek';
import getCheapestCardValue from './functions/sorare/get-cheapest-card-value';
import getSorareClubsByLeagueSlug from './functions/sorare/get-sorare-clubs-by-league-slug';
import getSorareConversions from './functions/sorare/get-sorare-conversions';
import getSorarePlayersByClubSlug from './functions/sorare/get-sorare-players-club-slug';
import teamMap from './map';

const main = async () => {
  const nextGameweek = await getNextSo5Gameweek();

  const matches = await getMatchesByDate(
    223,
    nextGameweek.gameweekStart,
    nextGameweek.gameweekEnd,
  );

  const teamOdds: { [key: number]: number } = {};

  for (const match of matches) {
    const odds = await getMatchOdds(match.id);
    teamOdds[match.home] = odds.percentage.home;
    teamOdds[match.away] = odds.percentage.away;
  }

  const players: any[] = [];

  const sorareClubs = await getSorareClubsByLeagueSlug(
    'j1-100-year-vision-league', //laliga-es
  );

  const pointsPerPound = true;

  const score1 = 0.75;
  const score2 = 0.25;

  for (const club of sorareClubs) {
    const sorarePlayers = await getSorarePlayersByClubSlug(club.slug);
    for (const player of sorarePlayers) {
      const { averageScore5, averageScore15 } = player;
      let algoInput = Math.round(
        averageScore15 * score1 + averageScore5 * score2,
      );
      const teamId = teamMap[club.slug as keyof typeof teamMap];
      const percentage = teamOdds[teamId];
      const predictedScore = Math.round(
        percentage > 0 ? ((percentage - 50) / 100 + 1) * algoInput : 0,
      );
      players.push({ teamId, ...player, predictedScore });
    }
  }

  const sortedPlayers = players.sort(
    (a, b) => b.predictedScore - a.predictedScore,
  );

  if (pointsPerPound) {
    const conversions = await getSorareConversions();
    for (const player of sortedPlayers) {
      const cheapestCardValue = await getCheapestCardValue(player.slug);
    }
  }
};

main();
