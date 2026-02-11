const getDaysBetweenDates = (startDate: string, endDate: string) => {
  const dates = [];

  // Convert the start and end dates to JavaScript Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Loop through each date between the start and end dates
  let current = new Date(start);
  while (current <= end) {
    // Get the current date in the required format (YYYYMMDD)
    const year = current.getFullYear().toString();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const day = current.getDate().toString().padStart(2, '0');
    const dateStr = year + month + day;

    // Add the current date to the dates array
    dates.push(dateStr);

    // Move to the next day
    current.setDate(current.getDate() + 1);
  }

  // Ensure the end date is included in the array
  const endYear = end.getFullYear().toString();
  const endMonth = (end.getMonth() + 1).toString().padStart(2, '0');
  const endDay = end.getDate().toString().padStart(2, '0');
  const endDateStr = endYear + endMonth + endDay;
  dates.push(endDateStr);

  return dates;
};

export default getDaysBetweenDates;
