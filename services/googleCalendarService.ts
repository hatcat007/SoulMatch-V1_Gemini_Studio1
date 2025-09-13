import type { GoogleCalendarSettings, Event } from '../types';

const SETTINGS_KEY = 'googleCalendarSettings';

export function getCalendarSettings(): GoogleCalendarSettings | null {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            // Simple check to ensure the token is not expired, if it is, treat as disconnected
            if (settings.expiry && settings.expiry < Date.now()) {
                console.log("Google Calendar token expired.");
                clearCalendarSettings();
                return null;
            }
            return settings;
        }
    } catch (e) {
        console.error("Could not load calendar settings from localStorage", e);
    }
    return null;
}

export function saveCalendarSettings(settings: GoogleCalendarSettings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("Could not save calendar settings to localStorage", e);
    }
}

export function clearCalendarSettings() {
    localStorage.removeItem(SETTINGS_KEY);
}

/**
 * Simulates adding an event to the user's Google Calendar.
 * In a real application, this function would make an authenticated API call to Google.
 * @param event The event object from SoulMatch.
 * @param addToast A function to display a notification to the user.
 */
export async function addEventToCalendar(event: Event, addToast: (toastData: any) => void): Promise<void> {
    const settings = getCalendarSettings();
    if (!settings || !settings.connected) {
        return;
    }

    console.log(`Simulating: Adding event "${event.title}" to Google Calendar "${settings.selectedCalendar}" for user ${settings.email}`);
    
    // In a real app, we'd use the access token and a refresh mechanism here to call:
    // POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
    // with an event resource in the body.

    // Simulate the network delay of the API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Provide immediate user feedback
    addToast({
        type: 'calendar',
        message: `Eventet "${event.title}" er tilføjet til din Google Kalender.`,
    });
}
