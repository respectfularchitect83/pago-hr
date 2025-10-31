import { HolidayCalendar, HolidayInstance, PublicHoliday, SupportedCountry } from '../types';

// Holiday data compiled from official government sources:
// - Namibia: Ministry of Information and Communication Technology notices (https://www.mict.gov.na/public-holidays/)
// - South Africa: Government Communications public holidays list (https://www.gov.za/about-sa/public-holidays)

const namibia2024: PublicHoliday[] = [
    { date: '2024-01-01', name: "New Year's Day" },
    { date: '2024-03-21', name: 'Independence Day' },
    { date: '2024-03-29', name: 'Good Friday' },
    { date: '2024-04-01', name: 'Easter Monday' },
    { date: '2024-05-01', name: "Workers' Day" },
    {
        date: '2024-05-04',
        name: 'Cassinga Day',
        observedDate: '2024-05-06',
        notes: 'Observed on Monday because 4 May falls on a Saturday.'
    },
    {
        date: '2024-05-25',
        name: 'Africa Day',
        observedDate: '2024-05-27',
        notes: 'Observed on Monday because 25 May falls on a Saturday.'
    },
    { date: '2024-08-26', name: 'Heroes Day' },
    {
        date: '2024-12-10',
        name: 'Day of the Namibian Women and International Human Rights Day'
    },
    { date: '2024-12-25', name: 'Christmas Day' },
    { date: '2024-12-26', name: 'Family Day' }
];

const namibia2025: PublicHoliday[] = [
    { date: '2025-01-01', name: "New Year's Day" },
    { date: '2025-03-21', name: 'Independence Day' },
    { date: '2025-04-18', name: 'Good Friday' },
    { date: '2025-04-21', name: 'Easter Monday' },
    { date: '2025-05-01', name: "Workers' Day" },
    {
        date: '2025-05-04',
        name: 'Cassinga Day',
        observedDate: '2025-05-05',
        notes: 'Observed on Monday because 4 May falls on a Sunday.'
    },
    {
        date: '2025-05-25',
        name: 'Africa Day',
        observedDate: '2025-05-26',
        notes: 'Observed on Monday because 25 May falls on a Sunday.'
    },
    { date: '2025-08-26', name: 'Heroes Day' },
    {
        date: '2025-12-10',
        name: 'Day of the Namibian Women and International Human Rights Day'
    },
    { date: '2025-12-25', name: 'Christmas Day' },
    { date: '2025-12-26', name: 'Family Day' }
];

const southAfrica2024: PublicHoliday[] = [
    { date: '2024-01-01', name: "New Year's Day" },
    { date: '2024-03-21', name: 'Human Rights Day' },
    { date: '2024-03-29', name: 'Good Friday' },
    { date: '2024-04-01', name: 'Family Day' },
    { date: '2024-04-27', name: 'Freedom Day' },
    { date: '2024-05-01', name: "Workers' Day" },
    {
        date: '2024-06-16',
        name: 'Youth Day',
        observedDate: '2024-06-17',
        notes: 'Observed on Monday because 16 June falls on a Sunday.'
    },
    { date: '2024-08-09', name: "National Women's Day" },
    { date: '2024-09-24', name: 'Heritage Day' },
    { date: '2024-12-16', name: 'Day of Reconciliation' },
    { date: '2024-12-25', name: 'Christmas Day' },
    { date: '2024-12-26', name: 'Day of Goodwill' }
];

const southAfrica2025: PublicHoliday[] = [
    { date: '2025-01-01', name: "New Year's Day" },
    { date: '2025-03-21', name: 'Human Rights Day' },
    { date: '2025-04-18', name: 'Good Friday' },
    { date: '2025-04-21', name: 'Family Day' },
    {
        date: '2025-04-27',
        name: 'Freedom Day',
        observedDate: '2025-04-28',
        notes: 'Observed on Monday because 27 April falls on a Sunday.'
    },
    { date: '2025-05-01', name: "Workers' Day" },
    { date: '2025-06-16', name: 'Youth Day' },
    { date: '2025-08-09', name: "National Women's Day" },
    { date: '2025-09-24', name: 'Heritage Day' },
    { date: '2025-12-16', name: 'Day of Reconciliation' },
    { date: '2025-12-25', name: 'Christmas Day' },
    { date: '2025-12-26', name: 'Day of Goodwill' }
];

export const publicHolidayCalendars: Record<SupportedCountry, HolidayCalendar[]> = {
    'Namibia': [
        { year: 2024, holidays: namibia2024 },
        { year: 2025, holidays: namibia2025 }
    ],
    'South Africa': [
        { year: 2024, holidays: southAfrica2024 },
        { year: 2025, holidays: southAfrica2025 }
    ]
};

export const getPublicHolidayCalendars = (country: SupportedCountry): HolidayCalendar[] => {
    return publicHolidayCalendars[country] || [];
};

export const getPublicHolidayInstances = (
    country: SupportedCountry | undefined,
    years: number[]
): HolidayInstance[] => {
    if (!country) {
        return [];
    }
    const targetYears = new Set(years);
    const calendars = publicHolidayCalendars[country] || [];
    const instances: HolidayInstance[] = [];

    calendars.forEach(calendar => {
        if (!targetYears.has(calendar.year)) {
            return;
        }
        calendar.holidays.forEach(holiday => {
            instances.push({
                date: holiday.date,
                name: holiday.name,
                isObserved: false,
                originalDate: holiday.date,
                notes: holiday.notes
            });
            if (holiday.observedDate) {
                instances.push({
                    date: holiday.observedDate,
                    name: holiday.name,
                    isObserved: true,
                    originalDate: holiday.date,
                    notes: holiday.notes
                });
            }
        });
    });

    return instances;
};

export const getPublicHolidayDateSet = (
    country: SupportedCountry | undefined,
    years: number[]
): Set<string> => {
    const instances = getPublicHolidayInstances(country, years);
    return new Set(instances.map(instance => instance.date));
};

export const getPublicHolidaysForDisplay = (
    country: SupportedCountry,
    fromYear: number,
    toYear: number
): HolidayInstance[] => {
    const requestedYears: number[] = [];
    for (let year = fromYear; year <= toYear; year++) {
        requestedYears.push(year);
    }
    const instances = getPublicHolidayInstances(country, requestedYears);
    return instances
        .filter(instance => {
            const year = Number(instance.date.slice(0, 4));
            return year >= fromYear && year <= toYear;
        })
        .sort((a, b) => {
            if (a.date < b.date) return -1;
            if (a.date > b.date) return 1;
            if (a.isObserved === b.isObserved) return 0;
            return a.isObserved ? 1 : -1;
        });
};
