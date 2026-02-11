import { GraphQLClient } from 'graphql-request';
import * as dotenv from 'dotenv';
dotenv.config();

const { SRJWT, SRAPIKEY } = process.env;

const graphQLClient = new GraphQLClient('https://api.sorare.com/graphql', {
  headers: {
    Authorization: `${SRJWT}`,
    APIKEY: `${SRAPIKEY}`,
  },
});

export default graphQLClient;
