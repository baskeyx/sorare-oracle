import connect from './mongo/connect';
import clubMap from '../data/club-map-sorare-fotmob';

const checkClub = async () => {
  const { Cards } = await connect();
  const cards = await Cards.find();
  const uniqueClubs = [...new Set(cards.map((card) => card.clubSlug))];

  const clubSlugs = Object.keys(clubMap);

  for (const slug of uniqueClubs) {
    if (!clubSlugs.includes(slug)) {
      console.log(`${slug} is not in the club map`);
    }
  }
};

//export default checkClub;
checkClub();
