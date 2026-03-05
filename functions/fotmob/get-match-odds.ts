import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OVERWRITE_ODDS_PATH = path.join(
  __dirname,
  '../../data/overwrite-odds.json',
);

export type OverwriteOddsEntry = {
  home: number;
  away: number;
  playerSlugs: string[];
};

const getOverwriteOdds = (): Record<string, OverwriteOddsEntry> => {
  try {
    const raw = fs.readFileSync(OVERWRITE_ODDS_PATH, 'utf8');
    const data = JSON.parse(raw);
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
};

const writeOverwriteOddsEntry = (matchId: number, entry: OverwriteOddsEntry) => {
  const existing = getOverwriteOdds();
  existing[String(matchId)] = entry;
  fs.writeFileSync(
    OVERWRITE_ODDS_PATH,
    JSON.stringify(existing, null, 2),
    'utf8',
  );
};

/** Add a player slug to the overwrite entry for a match (e.g. when that match had no odds). */
export const addPlayerSlugToOverwriteOdds = (
  matchId: number,
  slug: string,
) => {
  const existing = getOverwriteOdds();
  const key = String(matchId);
  const entry = existing[key] ?? {
    home: 0,
    away: 0,
    playerSlugs: [],
  };
  if (!entry.playerSlugs.includes(slug)) {
    entry.playerSlugs = [...entry.playerSlugs, slug];
    existing[key] = entry;
    fs.writeFileSync(
      OVERWRITE_ODDS_PATH,
      JSON.stringify(existing, null, 2),
      'utf8',
    );
  }
};

const oddsToPercentage = (odds: { home: number; away: number }) => ({
  home: Number.isFinite(odds.home) && odds.home > 0 ? 100 / odds.home : 0,
  away: Number.isFinite(odds.away) && odds.away > 0 ? 100 / odds.away : 0,
});

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
  const overwrite = getOverwriteOdds();
  const key = String(matchId);
  const overwriteEntry = overwrite[key];

  if (overwriteEntry) {
    const odds = {
      home: overwriteEntry.home,
      away: overwriteEntry.away,
    };
    const percentage = oddsToPercentage(odds);
    const hadNoOdds = overwriteEntry.home === 0 && overwriteEntry.away === 0;
    return { matchId, odds, percentage, hadNoOdds };
  }

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
    const placeholder: OverwriteOddsEntry = {
      home: 0,
      away: 0,
      playerSlugs: [],
    };
    writeOverwriteOddsEntry(matchId, placeholder);
    const odds = { home: 0, away: 0 };
    const percentage = oddsToPercentage(odds);
    return { matchId, odds, percentage, hadNoOdds: true };
  }

  const odds =
    results.length === 1
      ? results[0]
      : {
          home: results.reduce((sum, r) => sum + r.home, 0) / results.length,
          away: results.reduce((sum, r) => sum + r.away, 0) / results.length,
        };

  const percentage = oddsToPercentage(odds);
  return { matchId, odds, percentage, hadNoOdds: false };
};

export default getMatchOdds;
