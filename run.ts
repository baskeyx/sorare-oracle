import { getNextSo5Gameweek } from './functions/get-next-gameweek';

const main = async () => {
  const nextGameweek = await getNextSo5Gameweek();
  console.log(nextGameweek);
};

main();
