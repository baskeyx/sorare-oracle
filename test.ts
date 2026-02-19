import getSorareClubsByLeagueSlug from './functions/sorare/get-sorare-clubs-by-league-slug';
import axios from 'axios';

const run = async () => {
  const teams: { [key: number]: string } = {};
  const fotmobCompetitionId = 110; // 69 // 64
  const response = await axios.get(
    `https://www.fotmob.com/api/leagues?id=${fotmobCompetitionId}`,
  );
  const { data } = response;
  const { table, overview } = data;

  // Collect all "all" standings arrays; Fotmob uses different layouts per league.
  const allTables: Array<{ all: Array<{ id: number; name: string }> }> = [];

  if (Array.isArray(table)) {
    for (const t of table) {
      const tab = t?.data?.table ?? t?.data?.tables?.[0]?.table;
      if (tab?.all) allTables.push(tab);
    }
  }

  if (
    allTables.length === 0 &&
    overview?.table &&
    Array.isArray(overview.table)
  ) {
    for (const t of overview.table) {
      const tables = t?.data?.tables;
      if (Array.isArray(tables)) {
        for (const st of tables) {
          if (st?.table?.all) allTables.push(st.table);
        }
      } else if (t?.data?.table?.all) {
        allTables.push(t.data.table);
      }
    }
  }

  for (const { all } of allTables) {
    for (const row of all) {
      const { id, name } = row;
      teams[id] = name as string;
    }
  }
  console.log(teams);
  const sorareClubs = await getSorareClubsByLeagueSlug('ligue-2-fr'); // super-league-ch // premiership-gb-sct
  const sorareClubsMap: { [key: string]: string | null } = {};
  for (const club of sorareClubs) {
    sorareClubsMap[club.slug] = null;
  }
  console.log(sorareClubsMap);
};

run();
