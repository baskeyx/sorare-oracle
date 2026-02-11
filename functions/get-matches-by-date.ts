import axios from 'axios';
import getDaysBetweenDates from './get-days-between-dates';

const getMatchesByDate = async (
  leagueFotmobId: number,
  startDate: string,
  endDate: string,
) => {
  const dates = getDaysBetweenDates(startDate, endDate);
  const competitionIds = [leagueFotmobId];
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const matches: { home: number; away: number; id: number }[] = [];

  const errors: any[] = [];

  for (const date of dates) {
    const url = `https://www.fotmob.com/api/data/matches?date=${date}&timezone=Europe%2FLondon&ccode3=GBR`;
    console.log(url);
    try {
      const dateResponse = await axios(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json,text/plain,*/*',
          'Accept-Language': 'en-GB,en;q=0.9',
          Referer: 'https://www.fotmob.com/',
          Origin: 'https://www.fotmob.com',
        },
      });
      const { data } = dateResponse;

      if (!data || !data.leagues) {
        console.warn(`⚠️  No leagues data returned for date ${date}`);
        continue;
      }

      for (let league of data.leagues) {
        if (competitionIds.includes(league.primaryId)) {
          for (let match of league.matches) {
            const { cancelled } = match.status;
            const utcTime = new Date(match.status.utcTime).getTime();
            if (utcTime > startTime && utcTime < endTime) {
              if (!cancelled) {
                matches.push({
                  home: match.home.id,
                  away: match.away.id,
                  id: match.id,
                });
              }
            }
          }
        }
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; statusText?: string; data?: unknown };
        message?: string;
      };
      const errorInfo = {
        date,
        url,
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.message ?? String(error),
        responseData: err.response?.data,
      };
      errors.push(errorInfo);

      // Log the error but continue with other dates
      console.error(`❌ Failed to fetch matches for date ${date} (${url}):`, {
        status: errorInfo.status || 'N/A',
        statusText: errorInfo.statusText || 'N/A',
        message: errorInfo.message,
      });
    }
  }

  // If all dates failed, throw an error
  if (errors.length === dates.length) {
    const errorMessage = `All ${
      dates.length
    } date requests failed. First error: ${errors[0].status ?? 'Unknown'} - ${
      errors[0].message
    }`;
    const detailedError = new Error(errorMessage) as Error & {
      errors: typeof errors;
      dates: string[];
    };
    detailedError.errors = errors;
    detailedError.dates = dates;
    throw detailedError;
  }

  // If some dates failed, log a summary
  if (errors.length > 0) {
    console.warn(
      `⚠️  ${errors.length} out of ${dates.length} date requests failed, but continuing with successful dates`,
    );
  }

  return matches;
};

export default getMatchesByDate;
