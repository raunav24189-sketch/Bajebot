const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { google } = require('googleapis');
const express = require('express');
const cron = require('node-cron');
const chrono = require('chrono-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Store user OAuth clients and tokens
const userCalendars = new Map();

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// WhatsApp client events
client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp bot is ready!');
    console.log('Bot is now listening for messages...');
});

client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated successfully');
});

// Main message handler
client.on('message', async (message) => {
    const chat = await message.getChat();
    const userId = message.from;
    const text = message.body.toLowerCase().trim();

    console.log(`Message from ${userId}: ${text}`);

    try {
        // Command: Link Google Calendar
        if (text.startsWith('/link')) {
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/calendar'],
                state: userId // Pass userId to identify user after OAuth
            });
            
            await message.reply(
                `🔗 *Link Your Google Calendar*\n\n` +
                `Click this link to authorize:\n${authUrl}\n\n` +
                `After authorizing, send me the code you receive.`
            );
        }

        // Command: Save OAuth code
        else if (text.startsWith('/code ')) {
            const code = text.replace('/code ', '').trim();
            
            try {
                const { tokens } = await oauth2Client.getToken(code);
                
                // Store tokens for this user
                const userAuth = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    process.env.GOOGLE_REDIRECT_URI
                );
                userAuth.setCredentials(tokens);
                
                userCalendars.set(userId, {
                    auth: userAuth,
                    tokens: tokens
                });
                
                await message.reply('✅ Google Calendar linked successfully! Try `/today` to see your schedule.');
            } catch (error) {
                await message.reply('❌ Invalid code. Please try `/link` again.');
            }
        }

        // Command: Get today's schedule
        else if (text === '/today' || text === '/schedule') {
            if (!userCalendars.has(userId)) {
                await message.reply('⚠️ Please link your Google Calendar first using `/link`');
                return;
            }

            const userCal = userCalendars.get(userId);
            const calendar = google.calendar({ version: 'v3', auth: userCal.auth });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items;
            
            if (events.length === 0) {
                await message.reply('📅 No events scheduled for today!');
            } else {
                let schedule = '📅 *Today\'s Schedule*\n\n';
                events.forEach((event) => {
                    const start = event.start.dateTime || event.start.date;
                    const time = new Date(start).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    schedule += `⏰ ${time} - ${event.summary}\n`;
                });
                await message.reply(schedule);
            }
        }

        // Command: Add event
        else if (text.startsWith('/add ')) {
            if (!userCalendars.has(userId)) {
                await message.reply('⚠️ Please link your Google Calendar first using `/link`');
                return;
            }

            const eventText = text.replace('/add ', '').trim();
            const parsed = chrono.parse(eventText);

            if (parsed.length === 0) {
                await message.reply(
                    '❌ Could not understand the time. Try:\n' +
                    '`/add Meeting tomorrow at 2pm`\n' +
                    '`/add Gym session on Friday at 6pm`'
                );
                return;
            }

            const userCal = userCalendars.get(userId);
            const calendar = google.calendar({ version: 'v3', auth: userCal.auth });

            const startTime = parsed[0].start.date();
            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

            // Extract event title (text before time expression)
            const title = eventText.substring(0, parsed[0].index).trim() || 
                         eventText.substring(parsed[0].index + parsed[0].text.length).trim() ||
                         'New Event';

            const event = {
                summary: title,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'America/New_York', // Update based on user preference
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'America/New_York',
                },
            };

            const createdEvent = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            await message.reply(
                `✅ Event added!\n\n` +
                `📝 ${title}\n` +
                `⏰ ${startTime.toLocaleString()}`
            );
        }

        // Command: Get this week's schedule
        else if (text === '/week') {
            if (!userCalendars.has(userId)) {
                await message.reply('⚠️ Please link your Google Calendar first using `/link`');
                return;
            }

            const userCal = userCalendars.get(userId);
            const calendar = google.calendar({ version: 'v3', auth: userCal.auth });

            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: today.toISOString(),
                timeMax: nextWeek.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items;
            
            if (events.length === 0) {
                await message.reply('📅 No events scheduled for this week!');
            } else {
                let schedule = '📅 *This Week\'s Schedule*\n\n';
                let currentDay = '';
                
                events.forEach((event) => {
                    const start = event.start.dateTime || event.start.date;
                    const date = new Date(start);
                    const day = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                    
                    if (day !== currentDay) {
                        schedule += `\n*${day}*\n`;
                        currentDay = day;
                    }
                    
                    const time = date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    schedule += `  ⏰ ${time} - ${event.summary}\n`;
                });
                
                await message.reply(schedule);
            }
        }

        // Command: Help
        else if (text === '/help' || text === '/start') {
            await message.reply(
                `🤖 *WhatsApp Calendar Bot*\n\n` +
                `*Commands:*\n` +
                `/link - Link your Google Calendar\n` +
                `/today - View today's schedule\n` +
                `/week - View this week's schedule\n` +
                `/add [event] - Add a new event\n` +
                `  Example: /add Team meeting tomorrow at 3pm\n` +
                `/help - Show this message\n\n` +
                `Get started by linking your calendar with /link`
            );
        }

        // Unknown command
        else if (text.startsWith('/')) {
            await message.reply('❌ Unknown command. Type `/help` to see available commands.');
        }

    } catch (error) {
        console.error('Error handling message:', error);
        await message.reply('❌ An error occurred. Please try again.');
    }
});

// Express server for OAuth callback
app.get('/oauth/callback', async (req, res) => {
    const { code, state } = req.query; // state contains userId
    
    res.send(`
        <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h2>✅ Authorization Successful!</h2>
                <p>Copy this code and send it to the WhatsApp bot:</p>
                <code style="background: #f0f0f0; padding: 10px; font-size: 16px;">${code}</code>
                <p>Send: <code>/code ${code}</code></p>
            </body>
        </html>
    `);
});

// Daily morning routine reminder (8 AM)
cron.schedule('0 8 * * *', async () => {
    console.log('Running daily routine check...');
    
    for (const [userId, userCal] of userCalendars) {
        try {
            const calendar = google.calendar({ version: 'v3', auth: userCal.auth });
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items;
            
            if (events.length > 0) {
                let schedule = '🌅 *Good morning! Here\'s your schedule for today:*\n\n';
                events.forEach((event) => {
                    const start = event.start.dateTime || event.start.date;
                    const time = new Date(start).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    schedule += `⏰ ${time} - ${event.summary}\n`;
                });
                
                await client.sendMessage(userId, schedule);
            }
        } catch (error) {
            console.error(`Error sending daily routine to ${userId}:`, error);
        }
    }
});

// Initialize
app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📱 OAuth callback: http://localhost:${PORT}/oauth/callback`);
});

client.initialize();
