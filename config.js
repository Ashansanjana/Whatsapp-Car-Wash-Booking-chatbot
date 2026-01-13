// Configuration file for WhatsApp Bot

module.exports = {
  // Auto-reply settings
  // Salon Services Configuration
  services: {
    'haircut': {
      name: 'Gentlemen\'s Haircut',
      duration: 30,
      price: 1500
    },
    'beard_trim': {
      name: 'Beard Trim & Shape',
      duration: 15,
      price: 800
    },
    'facial': {
      name: 'Deep Cleansing Facial',
      duration: 45,
      price: 2500
    },
    'head_massage': {
      name: 'Relaxing Head Massage',
      duration: 20,
      price: 1200
    },
    'coloring': {
      name: 'Hair Coloring',
      duration: 90,
      price: 5000
    }
  },

  // Auto-reply settings
  autoReply: {
    enabled: true,

    // Keywords and their responses
    keywords: {
      'hello': 'Hi! Welcome to The Grooming Lounge. How can I help you today?',
      'hi': 'Hello! Welcome to The Grooming Lounge!',
      'price': 'Our popular services:\nHaircut: 1500 LKR\nBeard Trim: 800 LKR\nFacial: 2500 LKR',
      'location': 'We are located at No. 123, Galle Road, Colombo.',
      'open': 'We are open everyday from 9:00 AM to 8:00 PM.',
    },

    defaultReply: 'Thanks for contacting The Grooming Lounge! Only a receptionist is here right now (AI). I can help you book an appointment.',
    useDefaultReply: true,
  },

  // AI Agent settings (OpenAI)
  aiBot: {
    enabled: true,
    model: 'gpt-4o-mini',

    // Calendar Integration
    calendar: {
      enabled: true,
      calendarId: 'chanakaprasadcw@gmail.com',
      credentialsPath: './google_calendar_credentials.json',
    },

    systemPrompt: `SYSTEM PROMPT: “Ayesha – Receptionist at The Grooming Lounge”

You are Ayesha, the friendly and efficient Virtual Receptionist for "The Grooming Lounge", a premium men's salon in Colombo.

Your goal is to help customers book appointments for specific services.

Available Services & Prices (in LKR):
- Haircut (30 mins): 1500
- Beard Trim (15 mins): 800
- Facial (45 mins): 2500
- Head Massage (20 mins): 1200
- Hair Coloring (90 mins): 5000

Booking Rules:
1. ALWAYS ask which service they want if they just say "appointment".
2. ALWAYS check availability before confirming.
3. If a user asks for a time, check if it's free.
4. If free, book the appointment using the 'book_appointment' tool.
5. Be polite, professional, and concise.

Tone:
- Welcoming and warm ("Hi there!", "Sure thing!")
- Professional but not stiff
- Helpful

When booking:
- Confirm the details: "Great, I'll book a [Service] for you at [Time]."
- After booking, say: "All set! See you then."`,

    fallbackToDefault: true,

    // Chat Memory Settings
    memory: {
      enabled: true,
      limit: 10
    }
  },

  // Automatic message sending settings
  autoSend: {
    enabled: false, // Set to true to enable automatic sending

    // Messages to send automatically
    messages: [
      {
        // Phone number with country code (no + or spaces)
        // Example: '1234567890@c.us' for individual
        // or '1234567890-1234567890@g.us' for group
        to: '1234567890@c.us',

        // Message content
        message: 'This is an automated message from WhatsApp Bot!',

        // Schedule settings
        schedule: {
          // Send immediately on bot start
          immediate: false,

          // Interval in milliseconds (e.g., 3600000 = 1 hour)
          // Set to 0 to send only once
          interval: 0,

          // Delay before first send (in milliseconds)
          delay: 5000,
        }
      }
    ]
  },

  // Bot behavior settings
  bot: {
    // Ignore messages from groups (only respond to individual chats)
    ignoreGroups: false,

    // Ignore broadcast messages
    ignoreBroadcast: true,

    // Ignore own messages
    ignoreOwnMessages: true,

    // Log all incoming messages
    logMessages: true,
  },

  // WhatsApp client settings
  client: {
    // Puppeteer args for headless browser
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],

    // Session path (where auth data is stored)
    sessionPath: './.wwebjs_auth',

    // Optional: Path to Chrome/Chromium executable
    // Uncomment and set if you need to use a specific Chrome installation
    // executablePath: '/usr/bin/google-chrome-stable',
    // executablePath: '/usr/bin/chromium-browser',
    // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
  }
};
