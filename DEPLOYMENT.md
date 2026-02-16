# Deployment Guide - Free Hosting Options

## Option 1: Railway (Recommended - Easiest)

### Why Railway?
- ✅ Super easy deployment
- ✅ 500 hours/month free ($5 credit)
- ✅ Automatic GitHub deployments
- ✅ Easy to view QR code in logs
- ✅ Built-in environment variables

### Steps:

1. **Prepare your code**
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Push to GitHub**
- Create a new repository on GitHub
- Push your code:
```bash
git remote add origin https://github.com/yourusername/whatsapp-calendar-bot.git
git push -u origin main
```

3. **Deploy to Railway**
- Go to [Railway.app](https://railway.app)
- Sign in with GitHub
- Click "New Project" → "Deploy from GitHub repo"
- Select your repository
- Railway will auto-detect Node.js

4. **Add Environment Variables**
- Click on your project
- Go to "Variables" tab
- Add all variables from `.env`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (use Railway URL)
  - `PORT` (Railway sets this automatically)

5. **Update Redirect URI**
- Get your Railway URL (e.g., `https://your-app.up.railway.app`)
- Update redirect URI in Google Cloud Console
- Update in Railway env vars: `https://your-app.up.railway.app/oauth/callback`

6. **View QR Code**
- Go to "Deployments" tab
- Click latest deployment
- View logs - QR code will appear in logs
- Scan with WhatsApp

### Cost: FREE (500 hours/month)

---

## Option 2: Render

### Why Render?
- ✅ True free tier (doesn't expire)
- ✅ Auto-deploy from GitHub
- ✅ Easy to use
- ⚠️ Free tier spins down after 15 min inactivity

### Steps:

1. **Push code to GitHub** (same as Railway)

2. **Create Render Account**
- Go to [Render.com](https://render.com)
- Sign up with GitHub

3. **Create New Web Service**
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Configure:
  - Name: `whatsapp-calendar-bot`
  - Environment: `Node`
  - Build Command: `npm install`
  - Start Command: `npm start`

4. **Add Environment Variables**
- Scroll to "Environment Variables"
- Add all from `.env`
- For `GOOGLE_REDIRECT_URI`: Use `https://your-app.onrender.com/oauth/callback`

5. **Update Google Cloud Console**
- Add Render URL to authorized redirect URIs

6. **Keep Alive (Optional)**
- Create a free cron job to ping your app every 14 minutes
- Use [cron-job.org](https://cron-job.org) or UptimeRobot

### Cost: FREE (with limitations)

---

## Option 3: Fly.io

### Why Fly.io?
- ✅ Good free tier (3 VMs)
- ✅ Better performance
- ✅ No sleep on inactivity
- ⚠️ Requires Dockerfile

### Steps:

1. **Install Fly CLI**
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

2. **Create Dockerfile**
Create `Dockerfile` in project root:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

3. **Login and Deploy**
```bash
flyctl auth login
flyctl launch

# Follow prompts:
# - App name: whatsapp-calendar-bot
# - Region: Choose closest to you
# - Database: No
# - Deploy now: No (we need to set env vars first)
```

4. **Set Environment Variables**
```bash
flyctl secrets set GOOGLE_CLIENT_ID="your-client-id"
flyctl secrets set GOOGLE_CLIENT_SECRET="your-secret"
flyctl secrets set GOOGLE_REDIRECT_URI="https://your-app.fly.dev/oauth/callback"
```

5. **Deploy**
```bash
flyctl deploy
```

6. **View Logs for QR Code**
```bash
flyctl logs
```

### Cost: FREE (3 shared-cpu VMs)

---

## Option 4: Oracle Cloud (Always Free - Advanced)

### Why Oracle Cloud?
- ✅ Truly always free (no time limits)
- ✅ Generous specs (1GB RAM, 1 OCPU)
- ✅ 24/7 uptime
- ⚠️ More complex setup
- ⚠️ Requires credit card (no charges on free tier)

### Steps:

1. **Create Oracle Cloud Account**
- Go to [cloud.oracle.com](https://cloud.oracle.com)
- Sign up for free tier
- Verify with credit card (won't be charged)

2. **Create Compute Instance**
- Navigate to Compute → Instances
- Click "Create Instance"
- Choose "Always Free Eligible" VM.Standard.E2.1.Micro
- Select Ubuntu 22.04
- Download SSH keys
- Create instance

3. **Connect via SSH**
```bash
ssh -i /path/to/private-key ubuntu@your-instance-ip
```

4. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

5. **Clone and Setup**
```bash
git clone https://github.com/yourusername/whatsapp-calendar-bot.git
cd whatsapp-calendar-bot
npm install
```

6. **Create .env file**
```bash
nano .env
# Add your environment variables
# Save with Ctrl+X, Y, Enter
```

7. **Open Port 3000**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

8. **Start with PM2**
```bash
pm2 start index.js --name whatsapp-bot
pm2 startup
pm2 save
```

9. **View QR Code**
```bash
pm2 logs whatsapp-bot
```

### Cost: FREE (Forever)

---

## Option 5: Local Deployment (24/7)

### For Raspberry Pi, Old Laptop, or Home Server

1. **Install Node.js** (version 18+)

2. **Clone Repository**
```bash
git clone <your-repo>
cd whatsapp-calendar-bot
npm install
```

3. **Create .env file**
```bash
cp .env.example .env
nano .env
# Add your credentials
```

4. **Use ngrok for Redirect URI** (if behind router)
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3000

# Use the https URL for GOOGLE_REDIRECT_URI
# Example: https://abc123.ngrok.io/oauth/callback
```

5. **Run with PM2**
```bash
npm install -g pm2
pm2 start index.js --name whatsapp-bot
pm2 startup
pm2 save
```

### Cost: FREE (just electricity)

---

## Comparison Table

| Platform | Free Tier | Always On? | Easy Setup | QR Code Access |
|----------|-----------|------------|------------|----------------|
| Railway | 500 hrs/mo | Yes* | ⭐⭐⭐⭐⭐ | Easy (logs) |
| Render | Unlimited | No (spins down) | ⭐⭐⭐⭐ | Easy (logs) |
| Fly.io | 3 VMs | Yes | ⭐⭐⭐ | Easy (CLI) |
| Oracle Cloud | Unlimited | Yes | ⭐⭐ | Medium (SSH) |
| Local/RPi | Unlimited | Yes | ⭐⭐⭐ | Easy (terminal) |

*Railway free tier = ~20 days of continuous uptime

---

## Recommended Setup for Each Use Case

### Just Testing / Learning
→ **Railway** or **Render**

### Personal Daily Use
→ **Fly.io** or **Oracle Cloud**

### Family/Friends (Multiple Users)
→ **Oracle Cloud** with database

### Production / Business
→ Paid VPS or WhatsApp Business API

---

## Important Notes

### Public IP for OAuth
- Your redirect URI must be publicly accessible
- Local development: Use ngrok
- Production: Use hosting platform's URL

### Updating Google Cloud Console
Always add the correct redirect URI:
- Railway: `https://your-app.up.railway.app/oauth/callback`
- Render: `https://your-app.onrender.com/oauth/callback`
- Fly.io: `https://your-app.fly.dev/oauth/callback`
- Oracle/VPS: `https://your-domain.com/oauth/callback`
- Local (ngrok): `https://abc123.ngrok.io/oauth/callback`

### Keeping WhatsApp Connected
- Bot needs stable connection
- If server restarts, need to rescan QR
- Consider using a VPS for best stability

### Scaling Up
When ready to scale beyond free tiers:
- DigitalOcean: $4/month
- Linode: $5/month
- AWS Lightsail: $3.50/month
- Google Cloud Run: Pay per use

---

## Troubleshooting

### "Cannot find QR code"
- Check deployment logs
- Railway: Deployments → Logs
- Render: Logs tab
- Fly.io: `flyctl logs`
- SSH: `pm2 logs whatsapp-bot`

### "OAuth redirect_uri_mismatch"
- Ensure redirect URI in Google Console EXACTLY matches your deployed URL
- Include `/oauth/callback` path
- Use `https://` not `http://`

### "Connection timed out"
- Check if port 3000 is open (for VPS)
- Verify firewall rules
- Test with: `curl http://localhost:3000`

### Bot disconnects frequently
- Free tiers may restart containers
- Use Oracle Cloud or local deployment for stability
- Consider paid VPS if critical
