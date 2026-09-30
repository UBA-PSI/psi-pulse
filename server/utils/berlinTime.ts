// Uhrzeiten und Wochentage für den Mailversand gelten in deutscher Zeit (A17), unabhängig davon,
// in welcher Zeitzone der Server läuft (der Container setzt kein TZ, läuft also in UTC).
// Sommer- und Winterzeit übernimmt Intl (Node bringt die Zeitzonendaten mit).
export const PULSE_TIME_ZONE = "Europe/Berlin"

const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PULSE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
})

const WEEKDAYS: Record<string, number> = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6}

export type BerlinParts = {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    weekday: number // wie Date.getDay(): 0 = Sonntag
}

export const berlinParts = (date: Date): BerlinParts => {
    const p: Record<string, string> = {}
    for (const part of formatter.formatToParts(date)) p[part.type] = part.value
    return {
        year: Number(p.year),
        month: Number(p.month),
        day: Number(p.day),
        hour: Number(p.hour),
        minute: Number(p.minute),
        weekday: WEEKDAYS[p.weekday],
    }
}

// Kalendertag in deutscher Zeit, z. B. "2026-09-27"
export const berlinDayKey = (date: Date): string => {
    const {year, month, day} = berlinParts(date)
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

// Montag der Woche (deutsche Zeit) als Kalendertag: gleicher Schlüssel = gleiche Woche
export const berlinWeekKey = (date: Date): string => {
    const {year, month, day, weekday} = berlinParts(date)
    const monday = new Date(Date.UTC(year, month - 1, day - ((weekday + 6) % 7)))
    return monday.toISOString().slice(0, 10)
}

// Minuten seit Mitternacht in deutscher Zeit
export const berlinMinutesOfDay = (date: Date): number => {
    const {hour, minute} = berlinParts(date)
    return hour * 60 + minute
}

// Stunde aus Formularen: ganze Zahl 0–23, sonst null
export const parseHour = (value: unknown): number | null => {
    const hour = typeof value === "number" ? value : parseInt(String(value), 10)
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null
}
