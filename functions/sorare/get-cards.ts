import connect from '../mongo/connect';
import handleGraphQLRequestWithCursor from '../graphql/graphql-with-cursor';

const getCards = async (owner: string) => {
  const { Cards } = await connect();
  const query = `
    query AllCardsFromUser($owner: String!, $cursor: String) {
      user(slug: $owner) {
        cards(sport: FOOTBALL, after: $cursor) {
          nodes {
            id: assetId
            inSeasonEligible
            cardEditionName
            rarityTyped
            seasonYear
            power
            xp
            anyPositions
            anyPlayer {
              slug
              displayName
              activeClub {
                slug
              }
              age
              averageScore5: averageScore (type: LAST_FIVE_SO5_AVERAGE_SCORE)
						  averageScore15: averageScore (type: LAST_FIFTEEN_SO5_AVERAGE_SCORE)
              averageScore10Played: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
            }
          }
          pageInfo {
            endCursor
          }
        }
      }
    }
  `;
  const variables = {
    owner,
    cursor: null,
  };
  const output = await handleGraphQLRequestWithCursor(query, variables);

  output.nodes.forEach(async (card: any) => {
    const {
      rarityTyped: rarity,
      anyPlayer,
      id,
      power,
      anyPositions: position,
      inSeasonEligible,
      cardEditionName,
    } = card;
    const {
      displayName,
      activeClub,
      averageScore5,
      averageScore15,
      averageScore10Played,
      age,
      slug,
    } = anyPlayer;

    const clubSlug = activeClub?.slug;

    if (
      rarity === 'custom_series' ||
      (rarity === 'common' && cardEditionName !== 'winter')
    )
      return false;
    console.log(
      await Cards.create({
        id,
        slug,
        name: displayName,
        rarity,
        position: position[0],
        power,
        owner,
        averageScore5: averageScore5 || 0,
        averageScore15: averageScore15 || 0,
        averageScore10Played: averageScore10Played || 0,
        inSeasonEligible,
        u23Eligible: age < 24,
        edition: cardEditionName || 'null',
        clubSlug: clubSlug || 'null',
      }),
    );
  });
};

getCards('baskey');

//export default getCards;
