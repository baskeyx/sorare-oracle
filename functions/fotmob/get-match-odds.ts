import axios from 'axios';

const getOddsFromResponse = (data: {
  odds?: {
    matchfactMarkets?: Array<{ selections?: Array<{ oddsDecimal?: number }> }>;
  };
}): { home: number; away: number } | null => {
  const selections = data?.odds?.matchfactMarkets?.[0]?.selections;
  if (!selections || selections.length < 3) return null;
  const home = Number(selections[0].oddsDecimal);
  const away = Number(selections[2].oddsDecimal);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away };
};

const getMatchOdds = async (matchId: number) => {
  const [bet365, betfair, skybet, paddypower] = await Promise.allSettled([
    axios(
      `https://www.fotmob.com/api/matchOdds?matchId=${matchId}&ccode3=GBR&bettingProvider=Bet365_UK+affiliate`,
    ),
    axios(
      `https://www.fotmob.com/api/matchOdds?matchId=${matchId}&ccode3=GBR&bettingProvider=Betfair+UK+Sportsbook_UK`,
    ),
    axios(
      `https://www.fotmob.com/api/data/matchOdds?matchId=${matchId}&ccode3=GBR&bettingProvider=Sky+Bet_UK`,
    ),
    axios(
      `https://www.fotmob.com/api/data/matchOdds?matchId=${matchId}&ccode3=GBR&bettingProvider=Paddy+Power_UK`,
    ),
  ]);

  const results: { home: number; away: number }[] = [];
  for (const settled of [bet365, betfair, skybet, paddypower]) {
    if (settled.status === 'fulfilled' && settled.value?.data) {
      const parsed = getOddsFromResponse(settled.value.data);
      if (parsed) results.push(parsed);
    }
  }

  if (results.length === 0) {
    throw new Error(
      `Failed to fetch odds for match ${matchId}: all betting provider requests failed`,
    );
  }

  const odds =
    results.length === 1
      ? results[0]
      : {
          home: results.reduce((sum, r) => sum + r.home, 0) / results.length,
          away: results.reduce((sum, r) => sum + r.away, 0) / results.length,
        };

  const percentage = { home: 0, away: 0 };
  percentage.home = 100 / Number(odds.home);
  percentage.away = 100 / Number(odds.away);
  return { matchId, odds, percentage };
};

export default getMatchOdds;
