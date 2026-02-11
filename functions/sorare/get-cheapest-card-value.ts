import graphQLClient from './graphql-client';

const getCheapestCardValue = async (slug: string) => {
  const query = `
    query PlayerPrices($slug: String!) {
    anyPlayer (slug: $slug) {
      displayName
      anyCards (first: 1, rarities: [limited], inSeasonEligible: true) {
        nodes {
          slug
          rarityTyped
          lowestPriceCard {
            slug
            liveSingleSaleOffer {
              receiverSide {
                amounts {
                  referenceCurrency
                  wei
                  gbpCents
                  eurCents
                  usdCents
                }
              }
            }
          }
        }
      }
    }
  }
  `;
  const variables = { slug };
  const data = await graphQLClient.request(query, variables);
  return data.anyPlayer.anyCards.nodes[0].lowestPriceCard.liveSingleSaleOffer
    .receiverSide.amounts;
};

export default getCheapestCardValue;
