# WhatsApp Bot - Automatic Sending & Reply System

An automatic WhatsApp messaging bot built with Node.js that can send automated messages and reply to incoming messages without using the official WhatsApp API. This bot uses WhatsApp Web through the `whatsapp-web.js` library.

## Features

- **Auto-Reply**: Automatically respond to messages based on keywords
- **Auto-Send**: Send scheduled messages to specific contacts or groups
- **No API Required**: Works through WhatsApp Web (no official API needed)
- **Easy Configuration**: Simple JSON-based configuration
- **Session Persistence**: Stays logged in between restarts
- **Message Logging**: Track all incoming messages

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A WhatsApp account
- Chrome/Chromium browser (see installation below)

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd whstspbot
```

### 2. Install Chrome/Chromium (if not already installed)

**Ubuntu/Debian:**
```bash
# Google Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb

# OR Chromium
sudo apt-get install chromium-browser
```

**macOS:**
```bash
# Using Homebrew
brew install --cask google-chrome
```

**Windows:**
Download and install from [https://www.google.com/chrome/](https://www.google.com/chrome/)

### 3. Install dependencies

**Option A: With Puppeteer's bundled Chromium (recommended)**
```bash
npm install
```

**Option B: Skip Chromium download (if you have Chrome/Chromium installed)**
```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

If you skip the download, you'll need to configure the Chrome path in `config.js`:
```javascript
client: {
  executablePath: '/usr/bin/google-chrome-stable',  // or your Chrome path
  // ...
}
```

### 4. Find your Chrome executable path (if needed)

**Linux:**
```bash
which google-chrome-stable
which chromium-browser
```

**macOS:**
```bash
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

**Windows:**
```
C:\Program Files\Google\Chrome\Application\chrome.exe
C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
```

## Configuration

Edit the `config.js` file to customize the bot behavior:

### Auto-Reply Settings

```javascript
autoReply: {
  enabled: true,  // Enable/disable auto-reply
  keywords: {
    'hello': 'Hi! Thanks for your message.',
    'help': 'I am an automated bot.',
    // Add more keyword-response pairs
  },
  defaultReply: 'Thanks for your message!',
  useDefaultReply: true,  // Reply even when no keyword matches
}
```

### Auto-Send Settings

```javascript
autoSend: {
  enabled: false,  // Set to true to enable
  messages: [
    {
      to: '1234567890@c.us',  // Phone number with @c.us
      message: 'Your automated message here',
      schedule: {
        immediate: false,      // Send on bot start
        interval: 3600000,     // Repeat every hour (in ms)
        delay: 5000,           // Initial delay (in ms)
      }
    }
  ]
}
```

### Phone Number Format

- **Individual chats**: `[country_code][number]@c.us`
  - Example: `14155551234@c.us` (USA number)
  - Example: `447700900123@c.us` (UK number)

- **Group chats**: `[group_id]@g.us`
  - To get group ID, check bot logs when it receives a group message

## Usage

1. Start the bot:
```bash
npm start
```

2. Scan the QR code with WhatsApp:
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices
   - Tap "Link a Device"
   - Scan the QR code shown in the terminal

3. Once connected, the bot will:
   - Log "WhatsApp Bot is ready!"
   - Start listening for messages
   - Send automatic messages if configured

## Development Mode

Run with auto-restart on file changes:
```bash
npm run dev
```

## How It Works

1. **Authentication**: The bot connects to WhatsApp Web using Puppeteer (headless Chrome)
2. **Session Storage**: Login credentials are saved locally, so you only need to scan the QR code once
3. **Message Listening**: The bot monitors all incoming messages
4. **Auto-Reply**: When a message contains a configured keyword, the bot sends an automatic reply
5. **Auto-Send**: Messages are sent on schedule to specified contacts

## Examples

### Example 1: Customer Service Bot

```javascript
keywords: {
  'hours': 'We are open Monday-Friday, 9 AM - 5 PM',
  'location': 'We are located at 123 Main Street',
  'pricing': 'Visit our website for current pricing',
}
```

### Example 2: Scheduled Reminders

```javascript
messages: [
  {
    to: '1234567890@c.us',
    message: 'Daily reminder: Team meeting at 10 AM!',
    schedule: {
      immediate: false,
      interval: 86400000,  // 24 hours
      delay: 3600000,      // Start after 1 hour
    }
  }
]
```

### Example 3: Welcome Message on Startup

```javascript
messages: [
  {
    to: 'mygroup@g.us',
    message: 'Bot is now online! 🤖',
    schedule: {
      immediate: true,
      interval: 0,  // Send only once
      delay: 0,
    }
  }
]
```

## Bot Settings

Configure bot behavior in `config.js`:

```javascript
bot: {
  ignoreGroups: false,        // Don't reply to group messages
  ignoreBroadcast: true,      // Ignore broadcast lists
  ignoreOwnMessages: true,    // Don't reply to own messages
  logMessages: true,          // Log incoming messages
}
```

## Troubleshooting

### QR Code Not Showing
- Make sure you have a stable internet connection
- Try clearing the `.wwebjs_auth` folder and restart

### Bot Not Responding
- Check that `autoReply.enabled` is set to `true`
- Verify keywords are lowercase in config
- Check console logs for errors

### Messages Not Sending
- Verify phone number format (include country code, use @c.us)
- Check that `autoSend.enabled` is set to `true`
- Ensure you're connected (check for "ready" message)

### Session Expired
- Delete the `.wwebjs_auth` folder
- Restart the bot and scan QR code again

## Security Notes

- Never share your `.wwebjs_auth` folder (contains session data)
- Don't commit session data to git (already in `.gitignore`)
- Use this bot responsibly and respect WhatsApp's Terms of Service
- Avoid sending spam or unsolicited messages

## Limitations

- Requires stable internet connection
- WhatsApp Web must be accessible
- Subject to WhatsApp's rate limits
- Cannot send messages to numbers not in your contacts (first message must come from them)

## Project Structure

```
whstspbot/
├── index.js           # Main bot application
├── start.js           # Starter script with pre-flight checks
├── config.js          # Configuration file
├── package.json       # Dependencies and scripts
├── .gitignore         # Git ignore rules
├── .env.example       # Environment variables template
└── README.md          # Documentation
```

## Contributing

Feel free to open issues or submit pull requests for improvements!

## License

MIT

## Disclaimer

This bot is for educational and personal use. Make sure to comply with WhatsApp's Terms of Service. The developers are not responsible for any misuse of this software.
