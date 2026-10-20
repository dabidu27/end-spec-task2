
export const isValidDateFormat = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const day = Number(date.slice(8, 10));
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    return parsedDate.getUTCFullYear() === year
        && parsedDate.getUTCMonth() === month - 1
        && parsedDate.getUTCDate() === day;
};

export const getDateInTimezone = (timestamp: string, timezone: string): string => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date(timestamp));

    const values = Object.fromEntries(
        parts
            .filter(({type}) => type !== 'literal')
            .map(({type, value}) => [type, value]),
    );

    return `${values.year}-${values.month}-${values.day}`;
};
