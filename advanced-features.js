// ADVANCED FEATURES - Add these to extend the bot
// This file shows how to add database persistence and advanced features

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// Initialize database
const adapter = new FileSync('db.json');
const db = low(adapter);

// Set default structure
db.defaults({ 
    users: [],
    preferences: {},
    routines: {}
}).write();

// Save user calendar credentials to database
function saveUserCredentials(userId, tokens) {
    const user = db.get('users').find({ id: userId }).value();
    
    if (user) {
        db.get('users')
            .find({ id: userId })
            .assign({ tokens: tokens, lastUpdated: new Date().toISOString() })
            .write();
    } else {
        db.get('users')
            .push({
                id: userId,
                tokens: tokens,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            })
            .write();
    }
}

// Load user credentials from database
function loadUserCredentials(userId) {
    return db.get('users').find({ id: userId }).value();
}

// Save user preferences (timezone, notification times, etc.)
function saveUserPreference(userId, key, value) {
    db.set(`preferences.${userId}.${key}`, value).write();
}

function getUserPreference(userId, key, defaultValue = null) {
    return db.get(`preferences.${userId}.${key}`).value() || defaultValue;
}

// Daily routine management
function saveRoutine(userId, routineName, tasks) {
    db.set(`routines.${userId}.${routineName}`, {
        tasks: tasks,
        createdAt: new Date().toISOString()
    }).write();
}

function getRoutine(userId, routineName) {
    return db.get(`routines.${userId}.${routineName}`).value();
}

// FEATURE: Custom reminder times
// Add to message handler:
/*
else if (text.startsWith('/remind ')) {
    // Parse: /remind 8:00 AM for daily schedule
    // Or: /remind 30m before events
    const reminderConfig = parseReminderConfig(text);
    saveUserPreference(userId, 'reminderTime', reminderConfig);
    await message.reply('✅ Reminder preferences saved!');
}
*/

// FEATURE: Create daily routines
/*
else if (text.startsWith('/routine ')) {
    // Example: /routine morning: Workout 6am, Breakfast 7am, Commute 8am
    const routineData = parseRoutineCommand(text);
    saveRoutine(userId, routineData.name, routineData.tasks);
    
    // Optionally add to Google Calendar
    for (const task of routineData.tasks) {
        // Add recurring event to calendar
    }
    
    await message.reply(`✅ Routine "${routineData.name}" saved!`);
}
*/

// FEATURE: Smart scheduling
/*
else if (text.startsWith('/suggest ')) {
    // Find free slots based on existing calendar
    const duration = parseDuration(text); // e.g., "1 hour"
    const freeSlots = await findFreeSlots(userId, duration);
    
    let response = '💡 Available time slots:\n\n';
    freeSlots.forEach((slot, i) => {
        response += `${i+1}. ${formatTimeSlot(slot)}\n`;
    });
    response += '\nReply with the number to schedule!';
    
    await message.reply(response);
}
*/

// FEATURE: Multi-calendar support
/*
else if (text.startsWith('/calendars')) {
    const calendar = google.calendar({ version: 'v3', auth: userCal.auth });
    const calendarList = await calendar.calendarList.list();
    
    let response = '📚 Your calendars:\n\n';
    calendarList.data.items.forEach((cal, i) => {
        response += `${i+1}. ${cal.summary} (${cal.id})\n`;
    });
    response += '\nUse /setcalendar [number] to set default';
    
    await message.reply(response);
}
*/

// FEATURE: Event search
/*
else if (text.startsWith('/find ')) {
    const searchTerm = text.replace('/find ', '').trim();
    const events = await searchEvents(userId, searchTerm);
    
    if (events.length === 0) {
        await message.reply(`No events found for "${searchTerm}"`);
    } else {
        let response = `🔍 Found ${events.length} event(s):\n\n`;
        events.forEach(event => {
            response += `📅 ${event.summary}\n⏰ ${formatDateTime(event.start)}\n\n`;
        });
        await message.reply(response);
    }
}
*/

// FEATURE: Delete events
/*
else if (text.startsWith('/delete ')) {
    // Implementation for deleting events
    // Could use event ID or search term
}
*/

// Helper functions

function parseReminderConfig(text) {
    // Parse reminder configuration from text
    // Return structured config object
}

function parseRoutineCommand(text) {
    // Parse routine creation command
    // Return { name: string, tasks: array }
}

async function findFreeSlots(userId, duration) {
    // Query calendar for free/busy information
    // Return available time slots
}

function formatTimeSlot(slot) {
    // Format time slot for display
}

async function searchEvents(userId, searchTerm) {
    const userCal = userCalendars.get(userId);
    const calendar = google.calendar({ version: 'v3', auth: userCal.auth });
    
    const response = await calendar.events.list({
        calendarId: 'primary',
        q: searchTerm,
        singleEvents: true,
        orderBy: 'startTime',
    });
    
    return response.data.items;
}

function formatDateTime(dateTimeObj) {
    const date = new Date(dateTimeObj.dateTime || dateTimeObj.date);
    return date.toLocaleString();
}

// FEATURE: Token refresh automation
async function refreshTokenIfNeeded(userId) {
    const user = loadUserCredentials(userId);
    if (!user || !user.tokens) return false;
    
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials(user.tokens);
    
    // Check if token is expiring soon
    if (user.tokens.expiry_date && user.tokens.expiry_date < Date.now() + 300000) {
        try {
            const { credentials } = await auth.refreshAccessToken();
            saveUserCredentials(userId, credentials);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
    
    return true;
}

module.exports = {
    saveUserCredentials,
    loadUserCredentials,
    saveUserPreference,
    getUserPreference,
    saveRoutine,
    getRoutine,
    refreshTokenIfNeeded,
    searchEvents
};
