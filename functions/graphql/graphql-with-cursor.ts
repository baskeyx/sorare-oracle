import { GraphQLClient } from 'graphql-request';
import * as dotenv from 'dotenv';
dotenv.config();

const { SRJWT, SRAPIKEY } = process.env;

const handleGraphQLRequestWithCursor = async (
  query: string,
  variables: any,
) => {
  const graphQLClient = new GraphQLClient('https://api.sorare.com/graphql', {
    headers: {
      Authorization: `${SRJWT}`,
      APIKEY: SRAPIKEY as string,
    },
  });

  let hasNextPage = true;
  let endCursor = variables.cursor;
  let nodes: any[] = [];

  while (hasNextPage) {
    const data = await graphQLClient.request(query, {
      ...variables,
      cursor: endCursor,
    });
    nodes = nodes.concat(data['user']['cards']['nodes']);
    endCursor = data['user']['cards']['pageInfo']['endCursor'];
    hasNextPage = Boolean(endCursor);
  }

  return {
    nodes,
  };
};

export default handleGraphQLRequestWithCursor;
