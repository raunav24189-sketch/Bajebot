# WhatsApp Calendar Bot 🤖📅

A free WhatsApp bot that integrates with Google Calendar to help you manage your daily routine, schedule events, and get automated reminders - all through WhatsApp messages!

## Features

- 📅 View daily and weekly schedules
- ➕ Add events using natural language ("Meeting tomorrow at 3pm")
- 🔔 Automatic daily morning routine reminders
- 🔗 Link multiple Google Calendar accounts
- 💬 Simple WhatsApp commands
- 🆓 Completely free to run

## How It Works

1. Bot connects to WhatsApp using `whatsapp-web.js`
2. Users link their Google Calendar via OAuth
3. Send commands through WhatsApp to manage calendar
4. Bot sends automated daily schedule every morning at 8 AM

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- A Google Cloud account (free)
- A phone with WhatsApp

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URI: `http://localhost:3000/oauth/callback`
   - Copy the Client ID and Client Secret

5. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - User type: External (for testing)
   - Add your email as a test user
   - Add scope: `https://www.googleapis.com/auth/calendar`

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback
PORT=3000
```

### 4. Run the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### 5. Link WhatsApp

1. When you start the bot, a QR code will appear in your terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices > Link a Device
4. Scan the QR code
5. The bot is now connected!

### 6. Link Google Calendar

1. Send `/link` to the bot on WhatsApp
2. Click the authorization link
3. Sign in with your Google account
4. Copy the code provided
5. Send `/code [your-code]` to the bot

## Usage Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/link` | Link Google Calendar | `/link` |
| `/code [code]` | Submit OAuth code | `/code 4/ABC123...` |
| `/today` | View today's schedule | `/today` |
| `/week` | View this week's schedule | `/week` |
| `/add [event]` | Add a new event | `/add Team meeting tomorrow at 3pm` |
| `/help` | Show help message | `/help` |

## Natural Language Event Adding

The bot understands natural language for adding events:

- `/add Dentist appointment tomorrow at 2pm`
- `/add Gym session on Friday at 6pm`
- `/add Conference call next Monday at 10am`
- `/add Dinner with friends on Saturday at 7:30pm`

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│  WhatsApp   │ ◄─────► │   Node.js    │ ◄─────► │ Google Calendar │
│   Users     │         │     Bot      │         │      API        │
└─────────────┘         └──────────────┘         └─────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   Express    │
                        │    Server    │
                        │ (OAuth Flow) │
                        └──────────────┘
```

## Deployment Options

### Free Hosting Options

1. **Railway** (Recommended for beginners)
   - Deploy with GitHub integration
   - 500 hours/month free
   - Easy QR code handling via logs

2. **Render**
   - Free tier available
   - Auto-deploy from GitHub
   - Note: Restarts after inactivity

3. **Fly.io**
   - Free tier: 3 VMs
   - Good performance
   - Requires Dockerfile

4. **Oracle Cloud (Always Free)**
   - VM.Standard.E2.1.Micro instance
   - More complex setup
   - Truly always free

### Deployment Steps (Railway Example)

1. Push code to GitHub
2. Connect Railway to your repository
3. Add environment variables in Railway dashboard
4. Deploy
5. Check logs for QR code to link WhatsApp

## Important Notes

### About whatsapp-web.js

⚠️ **Important**: This bot uses `whatsapp-web.js`, which is an unofficial library that automates WhatsApp Web. While it's free and works well, be aware:

- It's against WhatsApp's Terms of Service
- Your number could potentially be banned (rare for personal use)
- For production/business use, consider the official WhatsApp Business API

### Official Alternative

For a more robust solution (not free after initial tier):
- Use **WhatsApp Business API** via providers like Twilio, 360Dialog, or Meta directly
- Costs vary but typically ~$0.005-0.01 per message
- No ban risk, official support

### Token Storage

Currently, tokens are stored in memory. For production:
- Add a database (MongoDB, PostgreSQL, or even a JSON file)
- Encrypt stored tokens
- Implement token refresh logic

## Limitations

- Bot must be running continuously
- WhatsApp must stay connected (if bot restarts, rescan QR)
- Free hosting may have uptime limitations
- Currently supports one phone number per deployment

## Future Enhancements

- [ ] Add database for persistent storage
- [ ] Support multiple users
- [ ] Delete/edit existing events
- [ ] Custom reminder times
- [ ] Multiple calendar support per user
- [ ] Time zone configuration
- [ ] Event search functionality
- [ ] Weekly/monthly summaries
- [ ] Smart scheduling suggestions

## Troubleshooting

### QR Code Not Appearing
- Make sure you have a GUI terminal or check Railway/Render logs
- The bot needs to generate and display the QR for first-time setup

### "Could not understand the time"
- Be more specific: "tomorrow at 3pm" instead of "tomorrow afternoon"
- Include AM/PM for clarity

### OAuth Errors
- Ensure redirect URI matches exactly in Google Cloud Console
- Add your email as a test user in OAuth consent screen
- Check that Calendar API is enabled

### Bot Disconnects
- WhatsApp Web connections can drop
- Restart the bot and rescan QR code
- Consider using a VPS for stable connections

## Security Considerations

- Never commit `.env` file to git
- Use `.gitignore` to exclude sensitive files
- Store tokens encrypted in production
- Implement rate limiting for production use
- Validate user inputs

## License

MIT License - feel free to modify and use!

## Contributing

Contributions welcome! Feel free to submit issues or pull requests.

## Disclaimer

This project is for educational purposes. Use responsibly and be aware of WhatsApp's Terms of Service when using unofficial APIs.
