import graphQLClient from '../graphql/graphql-client';

const getSorarePredictedPowerLineupScore = async (
  playerSlug: string,
  predictedPowerScore: number,
) => {
  const query = `
       query GetNextGame($slug: String!) {
        football {
          player (slug: $slug) {
            futureGames (first: 1) {
              nodes {
                so5Score (playerSlug: $slug) {
                  playerGameStats {
                    footballPlayingStatusOdds {
                      starterOddsBasisPoints
                      substituteOddsBasisPoints
                      nonPlayingOddsBasisPoints
                    }
                  }
                }
              }
            }
          }
        }
      }`;

  const variables = { slug: playerSlug };

  const data = await graphQLClient.request(query, variables);
  const { nodes } = data.football.player.futureGames;

  if (
    nodes.length &&
    nodes[0].so5Score.playerGameStats.footballPlayingStatusOdds
  ) {
    const { starterOddsBasisPoints, substituteOddsBasisPoints } =
      nodes[0].so5Score.playerGameStats.footballPlayingStatusOdds;

    const startingLineupScore =
      predictedPowerScore * (starterOddsBasisPoints / 10000);
    const substituteLineupScore =
      (predictedPowerScore / 2) * (substituteOddsBasisPoints / 10000);

    const predictedPowerLineupScore =
      startingLineupScore + substituteLineupScore;

    return {
      predictedPowerLineupScore,
      startingLineupScore,
      substituteLineupScore,
    };
  }

  return {
    predictedPowerLineupScore: 0,
    startingLineupScore: 0,
    substituteLineupScore: 0,
  };
};

export default getSorarePredictedPowerLineupScore;
