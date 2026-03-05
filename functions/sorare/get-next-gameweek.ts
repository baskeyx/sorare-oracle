import { GraphQLClient } from 'graphql-request';
import * as dotenv from 'dotenv';
dotenv.config();

const { SRJWT, SRAPIKEY } = process.env;

const getNextSo5Gameweek = async (slug: string | null = null) => {
  const query =
    `
    query` +
    (slug ? `($slug: String!)` : '') +
    ` {
      so5 {
        so5Fixture` +
    (slug ? `(slug: $slug)` : '') +
    `{
          slug
          startDate
          endDate
        }
      }
    }`;

  const graphQLClient = new GraphQLClient('https://api.sorare.com/graphql', {
    headers: {
      Authorization: `${SRJWT}`,
      APIKEY: `${SRAPIKEY}`,
    },
  });

  const data = await graphQLClient.request(query, slug ? { slug } : undefined);
  const {
    slug: gameweekSlug,
    startDate: gameweekStart,
    endDate: gameweekEnd,
  } = data.so5.so5Fixture;

  return { gameweekSlug, gameweekStart, gameweekEnd };
};

export { getNextSo5Gameweek };
