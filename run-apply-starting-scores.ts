import fs from 'fs';
import getSorarePredictedPowerLineupScore from './functions/sorare/get-predicted-lineup';

const applyStartingScores = async () => {
  const predictedCards = JSON.parse(
    fs.readFileSync('./json/predicted-cards.json', 'utf8'),
  );
  const actualPlayers = predictedCards.filter(
    (card: any) => card.predictedScore > 0,
  );

  const playersMap: { [key: string]: number } = {};

  for (const player of actualPlayers) {
    playersMap[player.slug] = player.predictedScore;
  }

  for (const player of Object.keys(playersMap)) {
    const { predictedPowerLineupScore } =
      await getSorarePredictedPowerLineupScore(player, playersMap[player]);
    playersMap[player] = predictedPowerLineupScore;
  }

  for (const player of actualPlayers) {
    player.startingScore = playersMap[player.slug];
  }

  fs.writeFileSync(
    'json/actual-players-with-starting-scores.json',
    JSON.stringify(actualPlayers, null, 2),
    'utf8',
  );
};

applyStartingScores();
