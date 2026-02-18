import graphQLClient from './graphql-client';

const getSorareClubsByLeagueSlug = async (leagueSlug: string) => {
  const query = `
  query LeagueClubs($slug: String!) {
    football {
      competition(slug: $slug) {
        name
        clubs(first: 40) {
          nodes { slug name }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
  `;

  const variables = { slug: leagueSlug };

  const data = await graphQLClient.request(query, variables);
  return data.football.competition.clubs.nodes;
};

export default getSorareClubsByLeagueSlug;
