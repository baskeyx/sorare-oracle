import connect from './connect';

const getCards = async (query: any = {}) => {
  const { Cards } = await connect();
  const cards = await Cards.find(query).lean();
  return cards;
};

export default getCards;
