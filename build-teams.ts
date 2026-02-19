import { premierLeagueTeamMap } from './data/club-map-sorare-fotmob';
import fs from 'fs';

const buildTeams = async () => {
  const players = JSON.parse(
    fs.readFileSync('./json/actual-players-with-starting-scores.json', 'utf8'),
  );
  const filters = {
    scarcities: ['limited'],
    inSeason: true,
    u23Eligible: true,
    teamSlugs: [...premierLeagueTeamMap],
  };
};

buildTeams();
