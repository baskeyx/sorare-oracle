import getMatchOdds from './functions/fotmob/get-match-odds';
import getMatchesByDate from './functions/get-matches-by-date';
import { getNextSo5Gameweek } from './functions/sorare/get-next-gameweek';
import getCheapestCardValue from './functions/sorare/get-cheapest-card-value';
import getSorarePredictedPowerLineupScore from './functions/sorare/get-predicted-lineup';
import getSorareClubsByLeagueSlug from './functions/sorare/get-sorare-clubs-by-league-slug';
import getSorarePlayersByClubSlug from './functions/sorare/get-sorare-players-club-slug';
import { teamMap } from './data/club-map-sorare-fotmob';
import fs from 'fs';
import leagues from './data/competitions-map-sorare-fotmob';

/** When true, wait RATE_LIMIT_SECONDS between each API loop iteration to avoid "too many requests". */
const RATE_LIMIT_ENABLED = true;
const RATE_LIMIT_SECONDS = 2;

const rateLimit = () =>
  RATE_LIMIT_ENABLED
    ? new Promise((r) => setTimeout(r, RATE_LIMIT_SECONDS * 1000))
    : Promise.resolve();

const main = async () => {
  const nextGameweek = await getNextSo5Gameweek();
  const inSeason = false;
  const scarcity = 'limited';
  const pointsPerPound = true;

  const minPredictedScore = 50;

  const leagueIds = Object.values(leagues).map((league) => league.leagueId);
  const leagueSlugs = Object.values(leagues)
    .filter((league) => league.leagueId !== 42)
    .map((league) => league.leagueSlug);

  console.log(leagueSlugs);

  const matches = await getMatchesByDate(
    leagueIds,
    nextGameweek.gameweekStart,
    nextGameweek.gameweekEnd,
  );

  const teamOdds: { [key: number]: number } = {};

  for (const match of matches) {
    const odds = await getMatchOdds(match.id);
    teamOdds[match.home] = odds.percentage.home;
    teamOdds[match.away] = odds.percentage.away;
    await rateLimit();
  }

  const players: any[] = [];

  for (const leagueSlug of leagueSlugs) {
    const sorareClubs = await getSorareClubsByLeagueSlug(leagueSlug);
    await rateLimit();
    for (const club of sorareClubs) {
      const sorarePlayers = await getSorarePlayersByClubSlug(club.slug);
      await rateLimit();
      for (const player of sorarePlayers) {
        const { averageScore5, averageScore15, averageScore10Played } = player;
        const w15 = 0.55;
        const w10 = 0.35;
        const w5 = 0.1;

        const algoInput = Math.round(
          averageScore15 * w15 +
            averageScore10Played * w10 +
            averageScore5 * w5,
        );

        const teamId = teamMap[club.slug as keyof typeof teamMap];
        const percentage = teamOdds[teamId];
        const predictedScore = Math.round(
          percentage > 0 ? ((percentage - 50) / 100 + 1) * algoInput : 0,
        );
        players.push({ teamId, ...player, predictedScore });
      }
    }
  }

  const sortedPlayers = players.sort(
    (a, b) => b.predictedScore - a.predictedScore,
  );

  if (pointsPerPound) {
    const finalPlayers = [];
    for (const player of sortedPlayers.filter(
      (player) => player.predictedScore > minPredictedScore,
    )) {
      const cheapestCardValue = await getCheapestCardValue(
        player.slug,
        scarcity,
        inSeason,
      );
      const { predictedPowerLineupScore } =
        await getSorarePredictedPowerLineupScore(
          player.slug,
          player.predictedScore,
        );
      if (predictedPowerLineupScore > minPredictedScore) {
        const pointsPerPound = predictedPowerLineupScore / cheapestCardValue;
        finalPlayers.push({
          ...player,
          cheapestCardValue,
          pointsPerPound,
          predictedPowerLineupScore,
        });
      }
      await rateLimit();
    }
    fs.writeFileSync(
      'json/purchase-recommendations.json',
      JSON.stringify(
        finalPlayers.sort((a, b) => b.pointsPerPound - a.pointsPerPound),
        null,
        2,
      ),
      'utf8',
    );
  } else {
    fs.writeFileSync(
      'json/purchase-recommendations.json',
      JSON.stringify(sortedPlayers, null, 2),
      'utf8',
    );
  }
};

main();
