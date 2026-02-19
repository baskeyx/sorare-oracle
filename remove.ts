import fs from 'fs';

const FINAL_TEAM_PATH = './json/final_team.json';
const PLAYERS_PATH = './json/actual-players-with-starting-scores.json';

const main = () => {
  const finalTeamRaw = fs.readFileSync(FINAL_TEAM_PATH, 'utf8');
  const finalTeam = JSON.parse(finalTeamRaw) as {
    best?: { cards?: Array<{ id: string }> };
    lineup?: unknown[];
  };

  const idsToRemove = new Set<string>();
  if (finalTeam.best?.cards) {
    for (const card of finalTeam.best.cards) {
      if (card.id) idsToRemove.add(card.id);
    }
  }

  if (idsToRemove.size === 0) {
    console.log('No card ids found in final_team.json (best.cards). Nothing to remove.');
    return;
  }

  const playersRaw = fs.readFileSync(PLAYERS_PATH, 'utf8');
  const players = JSON.parse(playersRaw) as Array<{ id?: string; [key: string]: unknown }>;
  const before = players.length;
  const filtered = players.filter((p) => !idsToRemove.has(p.id ?? ''));
  const removed = before - filtered.length;

  fs.writeFileSync(PLAYERS_PATH, JSON.stringify(filtered, null, 2), 'utf8');
  console.log(`Removed ${removed} player(s) by id from ${PLAYERS_PATH}. Remaining: ${filtered.length}.`);
};

main();
