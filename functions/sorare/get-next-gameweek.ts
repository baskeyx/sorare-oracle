import { GraphQLClient } from 'graphql-request';
import * as dotenv from 'dotenv';
dotenv.config();

const { SRJWT, SRAPIKEY } = process.env;

const getNextSo5Gameweek = async () => {
  const query = `
    query {
      so5 {
        so5Fixture {
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

  const data = await graphQLClient.request(query);
  const {
    slug: gameweekSlug,
    startDate: gameweekStart,
    endDate: gameweekEnd,
  } = data.so5.so5Fixture;

  return { gameweekSlug, gameweekStart, gameweekEnd };
};

export { getNextSo5Gameweek };
