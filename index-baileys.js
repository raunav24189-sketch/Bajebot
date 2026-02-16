// ALTERNATIVE: Using Baileys (no Chrome needed, lighter weight)
// This works better on limited hosting like Render Free tier

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { google } = require('googleapis');
const express = require('express');
const cron = require('node-cron');
const chrono = require('chrono-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store user OAuth clients
const userCalendars = new Map();

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('Scan this QR code with WhatsApp:');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;
            
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        
        if (!m.message || m.key.fromMe) return;
        
        const messageText = m.message.conversation || 
                           m.message.extendedTextMessage?.text || '';
        
        const text = messageText.toLowerCase().trim();
        const userId = m.key.remoteJid;

        console.log(`Message from ${userId}: ${text}`);

        try {
            // Command: Link Google Calendar
            if (text.startsWith('/link')) {
                const authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: ['https://www.googleapis.com/auth/calendar'],
                    state: userId
                });
                
                await sock.sendMessage(userId, {
                    text: `🔗 *Link Your Google Calendar*\n\n` +
                          `Click this link to authorize:\n${authUrl}\n\n` +
                          `After authorizing, send me the code you receive.`
                });
            }

            // Command: Save OAuth code
            else if (text.startsWith('/code ')) {
                const code = text.replace('/code ', '').trim();
                
                try {
                    const { tokens } = await oauth2Client.getToken(code);
                    
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
                    
                    await sock.sendMessage(userId, {
                        text: '✅ Google Calendar linked successfully! Try `/today` to see your schedule.'
                    });
                } catch (error) {
                    await sock.sendMessage(userId, {
                        text: '❌ Invalid code. Please try `/link` again.'
                    });
                }
            }

            // Command: Get today's schedule
            else if (text === '/today' || text === '/schedule') {
                if (!userCalendars.has(userId)) {
                    await sock.sendMessage(userId, {
                        text: '⚠️ Please link your Google Calendar first using `/link`'
                    });
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
                    await sock.sendMessage(userId, {
                        text: '📅 No events scheduled for today!'
                    });
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
                    await sock.sendMessage(userId, { text: schedule });
                }
            }

            // Command: Add event
            else if (text.startsWith('/add ')) {
                if (!userCalendars.has(userId)) {
                    await sock.sendMessage(userId, {
                        text: '⚠️ Please link your Google Calendar first using `/link`'
                    });
                    return;
                }

                const eventText = text.replace('/add ', '').trim();
                const parsed = chrono.parse(eventText);

                if (parsed.length === 0) {
                    await sock.sendMessage(userId, {
                        text: '❌ Could not understand the time. Try:\n' +
                              '`/add Meeting tomorrow at 2pm`\n' +
                              '`/add Gym session on Friday at 6pm`'
                    });
                    return;
                }

                const userCal = userCalendars.get(userId);
                const calendar = google.calendar({ version: 'v3', auth: userCal.auth });

                const startTime = parsed[0].start.date();
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

                const title = eventText.substring(0, parsed[0].index).trim() || 
                             eventText.substring(parsed[0].index + parsed[0].text.length).trim() ||
                             'New Event';

                const event = {
                    summary: title,
                    start: {
                        dateTime: startTime.toISOString(),
                        timeZone: 'America/New_York',
                    },
                    end: {
                        dateTime: endTime.toISOString(),
                        timeZone: 'America/New_York',
                    },
                };

                await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                });

                await sock.sendMessage(userId, {
                    text: `✅ Event added!\n\n` +
                          `📝 ${title}\n` +
                          `⏰ ${startTime.toLocaleString()}`
                });
            }

            // Command: Help
            else if (text === '/help' || text === '/start') {
                await sock.sendMessage(userId, {
                    text: `🤖 *WhatsApp Calendar Bot*\n\n` +
                          `*Commands:*\n` +
                          `/link - Link your Google Calendar\n` +
                          `/today - View today's schedule\n` +
                          `/add [event] - Add a new event\n` +
                          `  Example: /add Team meeting tomorrow at 3pm\n` +
                          `/help - Show this message\n\n` +
                          `Get started by linking your calendar with /link`
                });
            }

        } catch (error) {
            console.error('Error handling message:', error);
            await sock.sendMessage(userId, {
                text: '❌ An error occurred. Please try again.'
            });
        }
    });
}

// Express server for OAuth callback
app.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;
    
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

// Initialize
app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📱 OAuth callback: http://localhost:${PORT}/oauth/callback`);
});

connectToWhatsApp();
