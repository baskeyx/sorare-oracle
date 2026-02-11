import graphQLClient from './graphql-client';

const getSorareConversions = async () => {
  const query = ` {
    config {
      exchangeRate {
        time
        ethRates {
          gbpCents
          eurCents
          usdCents
        }
      }
    }
  }`;
  const data = await graphQLClient.request(query);
  return data.config.exchangeRate.ethRates;
};

export default getSorareConversions;
