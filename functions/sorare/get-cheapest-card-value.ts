import graphQLClient from '../graphql/graphql-client';
import getSorareConversions from './get-sorare-conversions';

const RETRY_DELAY_MS = 3000;

function isInvalidCursorError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Invalid cursor');
}

const WEI_PER_ETH = 1e18;

type Amounts = {
  wei?: string | null;
  gbpCents?: number | null;
  eurCents?: number | null;
  usdCents?: number | null;
};

type EthRates = {
  gbpCents: number;
  eurCents: number;
  usdCents: number;
};

function amountsToGbp(amounts: Amounts, ethRates: EthRates): number {
  if (amounts.wei != null && Number(amounts.wei) > 0) {
    const eth = Number(amounts.wei) / WEI_PER_ETH;
    return (eth * ethRates.gbpCents) / 100;
  }
  if (amounts.gbpCents != null && amounts.gbpCents > 0) {
    return amounts.gbpCents / 100;
  }
  if (
    amounts.eurCents != null &&
    amounts.eurCents > 0 &&
    ethRates.eurCents > 0
  ) {
    return (amounts.eurCents / 100) * (ethRates.gbpCents / ethRates.eurCents);
  }
  if (
    amounts.usdCents != null &&
    amounts.usdCents > 0 &&
    ethRates.usdCents > 0
  ) {
    return (amounts.usdCents / 100) * (ethRates.gbpCents / ethRates.usdCents);
  }
  return 0;
}

const getCheapestCardValue = async (
  slug: string,
  scarcity: string,
  inSeasonEligible: boolean,
): Promise<number> => {
  const inSeason = inSeasonEligible
    ? `, inSeasonEligible: ${inSeasonEligible}`
    : '';
  const query = `
    query PlayerPrices($slug: String!) {
      anyPlayer(slug: $slug) {
        displayName
        anyCards(first: 1, rarities: [${scarcity}]${inSeason}) {
          nodes {
            slug
            rarityTyped
            lowestPriceCard {
              slug
              liveSingleSaleOffer {
                receiverSide {
                  amounts {
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

  const runRequest = () =>
    graphQLClient.request<{
      anyPlayer?: {
        anyCards?: {
          nodes?: Array<{
            lowestPriceCard?: {
              liveSingleSaleOffer?: { receiverSide?: { amounts?: Amounts } };
            };
          }>;
        };
      };
    }>(query, variables);

  let data: Awaited<ReturnType<typeof runRequest>>;
  let conversions: Awaited<ReturnType<typeof getSorareConversions>>;
  try {
    const [conv, result] = await Promise.all([
      getSorareConversions(),
      runRequest(),
    ]);
    conversions = conv;
    data = result;
  } catch (err) {
    if (!isInvalidCursorError(err)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    [conversions, data] = await Promise.all([
      getSorareConversions(),
      runRequest(),
    ]);
  }

  const amounts = data.anyPlayer?.anyCards?.nodes?.[0]?.lowestPriceCard
    ?.liveSingleSaleOffer?.receiverSide?.amounts as Amounts | undefined;

  if (!amounts) {
    return 0;
  }

  return amountsToGbp(amounts, conversions);
};

export default getCheapestCardValue;
