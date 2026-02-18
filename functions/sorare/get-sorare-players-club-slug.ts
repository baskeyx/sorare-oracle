import graphQLClient from '../graphql/graphql-client';

const getSorarePlayersByClubSlug = async (clubSlug: string) => {
  const query = `
query ClubPlayersBatch($clubSlug: String!) {
  football {
    club(slug: $clubSlug) {
      slug
      name
      activePlayers(first: 50) {
        nodes { 
          slug 
          displayName 
          position 
          age 
          averageScore5: averageScore (type: LAST_FIVE_SO5_AVERAGE_SCORE)
          averageScore15: averageScore (type: LAST_FIFTEEN_SO5_AVERAGE_SCORE) 
          averageScore10Played: averageScore(type: LAST_TEN_PLAYED_SO5_AVERAGE_SCORE)
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }}
  `;

  const variables = { clubSlug };

  const data = await graphQLClient.request(query, variables);
  return data.football.club.activePlayers.nodes;
};

export default getSorarePlayersByClubSlug;
