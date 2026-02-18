import getMatchOdds from './functions/fotmob/get-match-odds';
import getMatchesByDate from './functions/get-matches-by-date';
import { getNextSo5Gameweek } from './functions/get-next-gameweek';
import getCheapestCardValue from './functions/sorare/get-cheapest-card-value';
import getSorarePredictedPowerLineupScore from './functions/sorare/get-predicted-lineup';
import getSorareClubsByLeagueSlug from './functions/sorare/get-sorare-clubs-by-league-slug';
import getSorarePlayersByClubSlug from './functions/sorare/get-sorare-players-club-slug';
import teamMap from './map';
import fs from 'fs';

const main = async () => {
  const nextGameweek = await getNextSo5Gameweek();

  const leagues = {
    JP: {
      leagueId: 223,
      leagueSlug: 'j1-100-year-vision-league',
    },
    ES: {
      leagueId: 87,
      leagueSlug: 'laliga-es',
    },
    FR: {
      leagueId: 53,
      leagueSlug: 'ligue-1-fr',
    },
    DE: {
      leagueId: 54,
      leagueSlug: 'bundesliga-de',
    },
    IT: {
      leagueId: 55,
      leagueSlug: 'serie-a-it',
    },
    EN: {
      leagueId: 47,
      leagueSlug: 'premier-league-gb-eng',
    },
    BE: {
      leagueId: 40,
      leagueSlug: 'jupiler-pro-league',
    },
    TU: {
      leagueId: 71,
      leagueSlug: 'spor-toto-super-lig',
    },
    PT: {
      leagueId: 61,
      leagueSlug: 'primeira-liga-pt',
    },
    NL: {
      leagueId: 57,
      leagueSlug: 'eredivisie',
    },
    DN: {
      leagueId: 46,
      leagueSlug: 'superliga-dk',
    },
    US: {
      leagueId: 130,
      leagueSlug: 'mlspa',
    },
    UCL: {
      leagueId: 42,
    },
  };

  // championship
  // bundes 2
  // brazil
  // russia
  // austria
  // arg
  // liga mx
  // kleague

  const inSeason = true;
  const scarcity = 'limited';
  const pointsPerPound = true;

  const allLeagues = Object.values(leagues);
  const allLeagueSlugs = allLeagues.map((league: any) => league.leagueSlug);

  const finalLeagueSlugs = [leagues['US'].leagueSlug];
  const finalLeagueIds = [leagues['US'].leagueId];

  const matches = await getMatchesByDate(
    finalLeagueIds,
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

  for (const leagueSlug of finalLeagueSlugs) {
    const sorareClubs = await getSorareClubsByLeagueSlug(leagueSlug);
    console.log(sorareClubs);
    for (const club of sorareClubs) {
      const sorarePlayers = await getSorarePlayersByClubSlug(club.slug);
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
      (player) => player.predictedScore > 50,
    )) {
      const cheapestCardValue = await getCheapestCardValue(
        player.slug,
        scarcity,
        inSeason,
      );
      const predictedPowerLineupScore =
        await getSorarePredictedPowerLineupScore(
          player.slug,
          player.predictedScore,
        );
      if (predictedPowerLineupScore > 50) {
        const pointsPerPound = predictedPowerLineupScore / cheapestCardValue;
        finalPlayers.push({
          ...player,
          cheapestCardValue,
          pointsPerPound,
          predictedPowerLineupScore,
        });
      }
    }
    fs.writeFileSync(
      'finalPlayers.json',
      JSON.stringify(
        finalPlayers.sort((a, b) => b.pointsPerPound - a.pointsPerPound),
        null,
        2,
      ),
      'utf8',
    );
  } else {
    fs.writeFileSync(
      'finalPlayers.json',
      JSON.stringify(sortedPlayers, null, 2),
      'utf8',
    );
  }
};

main();
