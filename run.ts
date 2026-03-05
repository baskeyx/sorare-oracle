import getMatchOdds, {
  addPlayerSlugToOverwriteOdds,
} from './functions/fotmob/get-match-odds';
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
const RATE_LIMIT_ENABLED = false;
const RATE_LIMIT_SECONDS = 2;
const isLineupOddsEnabled = true;

const rateLimit = () =>
  RATE_LIMIT_ENABLED
    ? new Promise((r) => setTimeout(r, RATE_LIMIT_SECONDS * 1000))
    : Promise.resolve();

const main = async () => {
  const nextGameweek = await getNextSo5Gameweek();
  const inSeason = true;
  const scarcity = 'limited';

  const minPredictedScore = 50;
  const top5Leagues = ['KO'];

  const top5LeaguesObject = top5Leagues.reduce(
    (
      acc: Record<string, (typeof leagues)[keyof typeof leagues]>,
      league: string,
    ) => {
      acc[league] = leagues[league as keyof typeof leagues];
      return acc;
    },
    {},
  );

  //  const leagueIds = Object.values(leagues).map((league) => league.leagueId);
  //   const leagueSlugs = Object.values(leagues)
  //     .filter((league) => league.leagueId !== 42)
  //     .map((league) => league.leagueSlug);

  const leagueIds = Object.values(top5LeaguesObject).map(
    (league) => league.leagueId,
  );
  const leagueSlugs = Object.values(top5LeaguesObject).map(
    (league) => league.leagueSlug,
  );

  console.log(leagueIds, leagueSlugs);

  const matches = await getMatchesByDate(
    leagueIds,
    nextGameweek.gameweekStart,
    nextGameweek.gameweekEnd,
  );

  const teamOdds: { [key: number]: number } = {};
  const noOddsMatches: Record<number, { home: number; away: number }> = {};

  for (const match of matches) {
    const odds = await getMatchOdds(match.id);
    teamOdds[match.home] = odds.percentage.home;
    teamOdds[match.away] = odds.percentage.away;
    if (odds.hadNoOdds) {
      noOddsMatches[match.id] = { home: match.home, away: match.away };
    }
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
        for (const [matchId, teams] of Object.entries(noOddsMatches)) {
          if (teams.home === teamId || teams.away === teamId) {
            addPlayerSlugToOverwriteOdds(Number(matchId), player.slug);
          }
        }
        const predictedScore = Math.round(
          percentage > 0 ? ((percentage - 50) / 100 + 1) * algoInput : 0,
        );
        console.log(player.slug, predictedScore);
        players.push({ teamId, ...player, predictedScore });
      }
    }
  }

  const sortedPlayers = players.sort(
    (a, b) => b.predictedScore - a.predictedScore,
  );

  const finalPlayers = [];
  for (const player of sortedPlayers.filter(
    (player) => player.predictedScore > minPredictedScore,
  )) {
    const cheapestCardValue = await getCheapestCardValue(
      player.slug,
      scarcity,
      inSeason,
    );
    let predictedPowerLineupScore = player.predictedScore;
    if (isLineupOddsEnabled) {
      const getPredictedPowerLineupScore =
        await getSorarePredictedPowerLineupScore(
          player.slug,
          player.predictedScore,
        );
      predictedPowerLineupScore =
        getPredictedPowerLineupScore.predictedPowerLineupScore;
    }
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
      finalPlayers
        .sort((a, b) => b.pointsPerPound - a.pointsPerPound)
        .filter((player) => !!player.pointsPerPound),
      null,
      2,
    ),
    'utf8',
  );
};

main();
