# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                  # run.ts — card predictions for owned cards (MongoDB-backed)
npm run card-predictions   # run-card-predictions.ts — predict scores for market players
npm run apply-starting-scores  # run-apply-starting-scores.ts — apply lineup probability to predicted-cards.json
npm run build-teams        # build-teams.ts — find optimal lineup from actual-players-with-starting-scores.json
npm run get-cards          # functions/sorare/get-cards.ts — sync owned cards from Sorare API into MongoDB
npm run check-clubs        # functions/check-clubs.ts — verify club slug mappings
npm run remove-cards       # remove.ts — remove cards from MongoDB
npm run quick-play         # quick-play.ts — ad-hoc script
```

All scripts run with `ts-node`. There are no tests.

## Environment Variables

A `.env` file is required with:
- `SRJWT` — Sorare API JWT token
- `SRAPIKEY` — Sorare API key
- `DATABASE_URL` — MongoDB connection string

## Architecture

This is a Sorare fantasy football oracle: it predicts player scores and recommends card purchases or builds optimal lineups.

### Data flow (two modes)

**Market purchase mode** (`run.ts`):
1. Fetch next SO5 gameweek dates from Sorare GraphQL API
2. Fetch upcoming matches for selected leagues from FotMob (`functions/get-matches-by-date.ts`)
3. For each match, fetch betting odds from FotMob (`functions/fotmob/get-match-odds.ts`) — averages Bet365, Betfair, Sky Bet, Paddy Power
4. For each club in selected leagues, fetch players via Sorare GraphQL and compute `predictedScore` using weighted averages (last 5/10/15 games) scaled by win probability
5. For players above score threshold, fetch cheapest card price from Sorare market and lineup probability (`get-predicted-lineup.ts`)
6. Output sorted by points-per-pound to `json/purchase-recommendations.json`

**Owned card mode** (3-step pipeline):
1. `npm run get-cards` — pulls owned cards from Sorare API, saves to MongoDB (collection: `cards`)
2. `npm run card-predictions` (`run-card-predictions.ts`) — reads MongoDB cards, fetches match odds, computes `predictedScore`, writes `json/predicted-cards.json`
3. `npm run apply-starting-scores` — reads `predicted-cards.json`, applies lineup probability from Sorare API (`footballPlayingStatusOdds`), writes `json/actual-players-with-starting-scores.json`
4. `npm run build-teams` (`build-teams.ts`) — reads `actual-players-with-starting-scores.json`, brute-force generates all valid 5 or 7-player lineups (GK+DF+MD+FD), scores each with captain multiplier, bonus cap, and same-team diversity bonus, writes best lineup to `json/final_team.json`

### Key scoring formula

```
algoInput = avg15*0.55 + avg10Played*0.35 + avg5*0.1
predictedScore = ((winPercentage - 50) / 100 + 1) * algoInput
FinalPredictedScore = predictedScore * (starterOdds/10000) + (predictedScore/2) * (substituteOdds/10000)
```

### Data mapping

- `data/competitions-map-sorare-fotmob.ts` — maps league codes (e.g. `EN`, `DE`) to FotMob `leagueId` and Sorare `leagueSlug`
- `data/club-map-sorare-fotmob.ts` — maps Sorare club slugs to FotMob team IDs; also exports per-league arrays used in `build-teams.ts` filters

### Odds overwrite mechanism

When FotMob returns no odds for a match, `get-match-odds.ts` writes a placeholder entry to `data/overwrite-odds.json` with `home: 0, away: 0`. This file can be manually edited to supply custom odds. Players in matches with no odds get `predictedScore: 0` unless the overwrite is populated.

### External APIs

- **Sorare GraphQL** (`https://api.sorare.com/graphql`) — gameweek dates, player stats, card prices, lineup odds, owned cards
- **FotMob** (`https://www.fotmob.com/api/`) — match schedules, betting odds
- **MongoDB** (via Mongoose) — stores owned cards locally; schema in `functions/mongo/schemas/card.model.ts`

The GraphQL client is a singleton in `functions/graphql/graphql-client.ts`. Pagination is handled by `functions/graphql/graphql-with-cursor.ts`.
