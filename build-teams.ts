import {
  bundesligaTeamMap,
  premierLeagueTeamMap,
  serieATeamMap,
  laLigaTeamMap,
  ligue1TeamMap,
  jLeagueTeamMap,
} from './data/club-map-sorare-fotmob';
import fs from 'fs';

const championEuropeTeamSlugs = [
  ...bundesligaTeamMap,
  ...laLigaTeamMap,
  ...premierLeagueTeamMap,
  ...serieATeamMap,
  ...ligue1TeamMap,
];

const filters: Filters = {
  scarcities: ['super_rare'],
  u23Eligible: null, // set to true to require U23 only; null = any
  editions: [], // e.g. ['winter'] or [] for any edition
  teamSlugs: [...(championEuropeTeamSlugs as string[])],
};

const parameters: Parameters = {
  captain: 1.5,
  players: 7,
  inSeasonMinPlayers: 0, // set to 4+ if competition requires minimum in-season cards
  noPowerMultiplier: false, // set to true to ignore card power (use FinalPredictedScore only)
  cap: null,
  bonusCap: 370, // 260 or 370
  bonusCapMultiplier: 1.04,
  bonusPlayersFromSameTeamLessThan: 3,
  bonusPlayersFromSameTeamLessThanMultiplier: 1.02,
};

type Card = {
  id: string;
  slug: string;
  name?: string;
  position: string;
  rarity?: string;
  scarcity?: string;
  clubSlug?: string;
  teamSlug?: string;
  averageScore10Played: number;
  FinalPredictedScore: number;
  power: number;
  u23Eligible?: boolean;
  edition?: string;
  [key: string]: unknown;
};

type Filters = {
  scarcities: string[];
  u23Eligible: boolean | null;
  editions: string[];
  teamSlugs: string[];
};

type Parameters = {
  captain: number;
  players: 5 | 7;
  inSeasonMinPlayers: number;
  noPowerMultiplier: boolean;
  cap: number | null;
  bonusCap: number | null;
  bonusCapMultiplier: number | null;
  bonusPlayersFromSameTeamLessThan: number | null;
  bonusPlayersFromSameTeamLessThanMultiplier: number | null;
};

type PointsBreakdown = {
  cardContributions: { slug: string; score: number; isCaptain: boolean }[];
  sumWithoutCaptain: number;
  captainBonusAmount: number;
  baseScore: number;
  bonusCapAmount: number;
  sameTeamBonusAmount: number;
  totalScore: number;
};

type ScoredLineup = {
  cards: Card[];
  baseScore: number;
  totalScore: number;
  captainIndex: number;
  capUsed: boolean;
  bonusCapUsed: boolean;
  sameTeamBonusUsed: boolean;
  breakdown: PointsBreakdown;
};

const POS_GK = 'Goalkeeper';
const POS_DF = 'Defender';
const POS_MD = 'Midfielder';
const POS_FD = 'Forward';

function applyFilters(players: Card[], filters: Filters): Card[] {
  return players.filter((player) => {
    if (filters.scarcities.length > 0) {
      const scarcity = player.scarcity ?? player.rarity ?? '';
      if (!filters.scarcities.includes(scarcity)) return false;
    }
    if (filters.u23Eligible !== null && filters.u23Eligible !== undefined) {
      if (player.u23Eligible !== filters.u23Eligible) return false;
    }
    if (filters.editions.length > 0) {
      if (!player.edition || !filters.editions.includes(player.edition))
        return false;
    }
    const teamSlug = player.teamSlug ?? player.clubSlug ?? '';
    if (filters.teamSlugs.length > 0 && !filters.teamSlugs.includes(teamSlug)) {
      return false;
    }
    return true;
  });
}

function groupByPosition(players: Card[]): Record<string, Card[]> {
  const gk: Card[] = [];
  const df: Card[] = [];
  const md: Card[] = [];
  const fd: Card[] = [];
  for (const p of players) {
    switch (p.position) {
      case POS_GK:
        gk.push(p);
        break;
      case POS_DF:
        df.push(p);
        break;
      case POS_MD:
        md.push(p);
        break;
      case POS_FD:
        fd.push(p);
        break;
      default:
        break;
    }
  }
  return { gk, df, md, fd };
}

function lineupBaseScore(
  cards: Card[],
  captainMultiplier: number,
  noPowerMultiplier: boolean,
): {
  baseScore: number;
  captainIndex: number;
  cardScores: number[];
  sumWithoutCaptain: number;
  captainContribution: number;
  captainBonusAmount: number;
} {
  const scores = cards.map((c) => {
    const base = c.FinalPredictedScore ?? 0;
    const mult = noPowerMultiplier ? 1 : (c.power ?? 1);
    return base * mult;
  });
  const captainIndex = scores.reduce(
    (best, _, i) => (scores[i] > scores[best] ? i : best),
    0,
  );
  const sumWithoutCaptain = scores.reduce((a, b) => a + b, 0);
  const captainBonusAmount = (captainMultiplier - 1) * scores[captainIndex];
  const captainContribution = scores[captainIndex] * captainMultiplier;
  const baseScore = sumWithoutCaptain + captainBonusAmount;
  return {
    baseScore,
    captainIndex,
    cardScores: scores,
    sumWithoutCaptain,
    captainContribution,
    captainBonusAmount,
  };
}

function sumAverage10(lineup: Card[]): number {
  return lineup.reduce((s, c) => s + (c.averageScore10Played ?? 0), 0);
}

function maxPlayersFromSameTeam(lineup: Card[]): number {
  const byTeam: Record<string, number> = {};
  for (const c of lineup) {
    const t = c.teamSlug ?? c.clubSlug ?? '';
    byTeam[t] = (byTeam[t] ?? 0) + 1;
  }
  return Math.max(0, ...Object.values(byTeam));
}

function scoreLineup(cards: Card[], params: Parameters): ScoredLineup {
  const {
    baseScore,
    captainIndex,
    cardScores,
    sumWithoutCaptain,
    captainBonusAmount,
  } = lineupBaseScore(cards, params.captain, params.noPowerMultiplier);
  const totalAverage10 = sumAverage10(cards);
  const capUsed = params.cap !== null && totalAverage10 <= params.cap;
  const bonusCapUsed =
    params.bonusCap !== null &&
    params.bonusCapMultiplier !== null &&
    totalAverage10 <= params.bonusCap;
  const maxSameTeam = maxPlayersFromSameTeam(cards);
  const sameTeamBonusUsed =
    params.bonusPlayersFromSameTeamLessThan !== null &&
    params.bonusPlayersFromSameTeamLessThanMultiplier !== null &&
    maxSameTeam < params.bonusPlayersFromSameTeamLessThan;

  const bonusCapAmount = bonusCapUsed
    ? (params.bonusCapMultiplier! - 1) * baseScore
    : 0;
  const sameTeamBonusAmount = sameTeamBonusUsed
    ? (params.bonusPlayersFromSameTeamLessThanMultiplier! - 1) * baseScore
    : 0;
  const totalScore = baseScore + bonusCapAmount + sameTeamBonusAmount;

  const breakdown: PointsBreakdown = {
    cardContributions: cards.map((c, i) => ({
      slug: c.slug,
      score: cardScores[i]! * (i === captainIndex ? params.captain : 1),
      isCaptain: i === captainIndex,
    })),
    sumWithoutCaptain,
    captainBonusAmount,
    baseScore,
    bonusCapAmount,
    sameTeamBonusAmount,
    totalScore,
  };

  return {
    cards,
    baseScore,
    totalScore,
    captainIndex,
    capUsed,
    bonusCapUsed,
    sameTeamBonusUsed,
    breakdown,
  };
}

function allUnique(cards: Card[]): boolean {
  const ids = new Set(cards.map((c) => c.id ?? c.slug));
  return ids.size === cards.length;
}

function allUniqueSlugs(cards: Card[]): boolean {
  const slugs = new Set(cards.map((c) => c.slug));
  return slugs.size === cards.length;
}

function inSeasonCount(cards: Card[]): number {
  return cards.filter((c) => c.inSeasonEligible === true).length;
}

function* generateLineups5(
  gk: Card[],
  df: Card[],
  md: Card[],
  fd: Card[],
  params: Parameters,
): Generator<Card[]> {
  for (const g of gk) {
    for (const d of df) {
      for (const m of md) {
        for (const f of fd) {
          const used = new Set([
            g.id ?? g.slug,
            d.id ?? d.slug,
            m.id ?? m.slug,
            f.id ?? f.slug,
          ]);
          const extraPool = [...df, ...md, ...fd].filter(
            (p) => !used.has(p.id ?? p.slug),
          );
          for (const e of extraPool) {
            const lineup = [g, d, m, f, e];
            if (params.cap !== null && sumAverage10(lineup) > params.cap)
              continue;
            if (inSeasonCount(lineup) < params.inSeasonMinPlayers) continue;
            yield lineup;
          }
        }
      }
    }
  }
}

function* generateLineups7(
  gk: Card[],
  df: Card[],
  md: Card[],
  fd: Card[],
  params: Parameters,
): Generator<Card[]> {
  for (const g of gk) {
    for (let i = 0; i < df.length; i++) {
      for (let j = i + 1; j < df.length; j++) {
        const d1 = df[i];
        const d2 = df[j];
        for (let k = 0; k < md.length; k++) {
          for (let l = k + 1; l < md.length; l++) {
            const m1 = md[k];
            const m2 = md[l];
            for (const f of fd) {
              const used = new Set(
                [g, d1, d2, m1, m2, f].map((p) => p.id ?? p.slug),
              );
              const extraPool = [...df, ...md, ...fd].filter(
                (p) => !used.has(p.id ?? p.slug),
              );
              for (const e of extraPool) {
                const lineup = [g, d1, d2, m1, m2, f, e];
                if (params.cap !== null && sumAverage10(lineup) > params.cap)
                  continue;
                if (inSeasonCount(lineup) < params.inSeasonMinPlayers) continue;
                yield lineup;
              }
            }
          }
        }
      }
    }
  }
}

const buildTeams = async () => {
  const raw = fs.readFileSync(
    './json/actual-players-with-starting-scores.json',
    'utf8',
  );
  const players: Card[] = JSON.parse(raw);

  const filtered = applyFilters(players, filters);
  const { gk, df, md, fd } = groupByPosition(filtered);

  console.log(
    `Filtered: ${filtered.length} players (GK: ${gk.length}, DF: ${df.length}, MD: ${md.length}, FD: ${fd.length})`,
  );
  if (
    filtered.length === 0 ||
    gk.length === 0 ||
    df.length === 0 ||
    md.length === 0 ||
    fd.length === 0
  ) {
    console.log(
      'No valid lineup: need at least one player in each position. Relax filters (scarcities, u23Eligible, editions, teamSlugs) or check your data.',
    );
    fs.writeFileSync(
      'json/final_team.json',
      JSON.stringify(
        {
          lineup: [],
          message: 'No valid lineup - insufficient players after filters',
        },
        null,
        2,
      ),
      'utf8',
    );
    return;
  }

  let best: ScoredLineup | null = null;
  let count = 0;

  const generator =
    parameters.players === 5
      ? generateLineups5(gk, df, md, fd, parameters)
      : generateLineups7(gk, df, md, fd, parameters);

  function buildOutput(b: ScoredLineup, evaluated: number) {
    return {
      totalLineupsEvaluated: evaluated,
      best: {
        cards: b.cards.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          position: c.position,
          FinalPredictedScore: c.FinalPredictedScore,
          averageScore10Played: c.averageScore10Played,
          power: c.power,
          clubSlug: c.clubSlug ?? c.teamSlug,
        })),
        captainSlug: b.cards[b.captainIndex].slug,
        baseScore: b.baseScore,
        totalScore: b.totalScore,
        capUsed: b.capUsed,
        bonusCapUsed: b.bonusCapUsed,
        sameTeamBonusUsed: b.sameTeamBonusUsed,
        pointsBreakdown: b.breakdown,
      },
    };
  }

  for (const lineup of generator) {
    if (!allUnique(lineup) || !allUniqueSlugs(lineup)) continue;
    count++;
    const scored = scoreLineup(lineup, parameters);
    if (best === null || scored.totalScore > best.totalScore) {
      best = scored;
      const output = buildOutput(best, count);
      fs.writeFileSync(
        'json/final_team.json',
        JSON.stringify(output, null, 2),
        'utf8',
      );
      console.log(
        `New best: totalScore ${best.totalScore.toFixed(2)} (after ${count} lineups evaluated)`,
      );
    }
  }

  if (best === null) {
    console.log('No valid lineup found.');
    fs.writeFileSync(
      'json/final_team.json',
      JSON.stringify({ lineup: [], message: 'No valid lineup' }, null, 2),
      'utf8',
    );
    return;
  }

  const output = buildOutput(best, count);

  console.log('\nFinal best lineup (totalScore):', best.totalScore);
  console.log('Points breakdown:');
  console.log(JSON.stringify(best.breakdown, null, 2));
  console.log('\nFull output:');
  console.log(JSON.stringify(output, null, 2));
};

buildTeams();
