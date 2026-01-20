require('dotenv').config(); // Load environment variables FIRST
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config'); // Now this can access process.env variables
const OpenAI = require('openai');
const HistoryManager = require('./history');

// Initialize Chat History Manager
let historyManager;
if (config.aiBot.memory && config.aiBot.memory.enabled) {
  historyManager = new HistoryManager(config.aiBot.memory.limit);
}

// Map to track processed message IDs to prevent double replies
const processedMessages = new Set();
// Clean up cache every hour to prevent memory leaks
setInterval(() => processedMessages.clear(), 3600000);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// Helper: Generate Unique Booking ID
function generateBookingId() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BK-WA-${dateStr}-${randomNum}`;
}

// Helper: Determine Package Type from Service Category
function getPackageType(serviceId) {
  const service = config.services[serviceId];
  if (!service) return 'Standard';

  const categoryMap = {
    'standard': 'Standard',
    'autoglym': 'Premium',
    'additional': 'Additional'
  };

  return categoryMap[service.category] || 'Standard';
}

// Helper: Format conversation transcript
function formatTranscript(messages) {
  return messages
    .filter(msg => msg.role !== 'system' && msg.role !== 'tool')
    .map(msg => {
      if (msg.role === 'user') return `User: ${msg.content}`;
      if (msg.role === 'assistant') return `Bot: ${msg.content}`;
      return '';
    })
    .filter(line => line)
    .join('\n');
}

// Helper: Send Booking to Webhook API
async function sendBookingWebhook(bookingData, customerInfo, conversationHistory) {
  try {
    const {
      serviceIds,
      vehicleType,
      startDateTime,
      customerName,
      phoneNumber,
      email,
      vehicleNumber,
      serviceAddress
    } = bookingData;

    // Handle both single service (string) or multiple services (array)
    const serviceArray = Array.isArray(serviceIds) ? serviceIds : [serviceIds];

    // Validate vehicle type
    if (!config.vehicleTypes[vehicleType]) {
      return { success: false, message: `Error: Invalid vehicle type '${vehicleType}'.` };
    }

    const vehicleTypeName = config.vehicleTypes[vehicleType];
    let totalPrice = 0;
    const serviceNames = [];

    // Validate all services and calculate total price
    for (const serviceId of serviceArray) {
      const service = config.services[serviceId];
      if (!service) {
        return { success: false, message: `Error: Service '${serviceId}' not found.` };
      }

      // Get price for specific vehicle type
      const price = service.prices[vehicleType];
      if (price === undefined) {
        return { success: false, message: `Error: No price found for ${service.name} with vehicle type ${vehicleTypeName}.` };
      }

      totalPrice += price;
      serviceNames.push(service.name);
    }

    // Parse date and time from ISO string or formatted string
    let preferredDate, preferredTime;

    if (startDateTime.includes('T')) {
      // ISO format: 2026-01-30T10:30:00+05:30
      const dt = new Date(startDateTime);
      preferredDate = dt.toISOString().split('T')[0]; // YYYY-MM-DD
      const hours = dt.getHours().toString().padStart(2, '0');
      const minutes = dt.getMinutes().toString().padStart(2, '0');
      preferredTime = `${hours}:${minutes}`; // HH:MM
    } else {
      // Assume date and time are already formatted
      preferredDate = startDateTime.split(' ')[0] || startDateTime;
      preferredTime = startDateTime.split(' ')[1] || '10:00';
    }

    // Generate unique booking ID
    const bookingId = generateBookingId();

    // Get primary service name (first service) and package type
    const primaryServiceName = serviceNames[0];
    const packageType = getPackageType(serviceArray[0]);

    // Use user-provided customer info
    const finalCustomerName = customerName || 'Customer';
    const customerPhone = phoneNumber || 'Not provided';

    // Format transcript
    const transcript = conversationHistory ? formatTranscript(conversationHistory) : 'WhatsApp booking conversation';

    // Build webhook payload
    const payload = {
      name: finalCustomerName,
      phone: customerPhone,
      email: email || '',
      bookingDetails: {
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        service_name: primaryServiceName,
        package_type: packageType,
        vehicle_type: vehicleTypeName,
        vehicle_number: vehicleNumber || '',
        service_address: serviceAddress || '',
        total_price: totalPrice
      },
      bookingId: bookingId,
      transcript: transcript
    };

    console.log('📤 Sending booking to webhook:', JSON.stringify(payload, null, 2));

    // Send POST request to webhook
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(config.aiBot.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.aiBot.webhook.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook Error:', response.status, errorText);
      return {
        success: false,
        message: `Error: Webhook returned ${response.status}. ${errorText}`
      };
    }

    const result = await response.json();
    console.log('✅ Webhook Response:', result);

    // Return success message
    const serviceList = serviceNames.join(', ');
    return {
      success: true,
      message: `✅ Booking confirmed successfully!\n\n📋 Booking ID: ${bookingId}\n👤 Customer: ${finalCustomerName}\n📞 Phone: ${customerPhone}\n📧 Email: ${email}\n🚗 Vehicle: ${vehicleTypeName} (${vehicleNumber})\n🛠️ Services: ${serviceList}\n📦 Package: ${packageType}\n📍 Address: ${serviceAddress}\n📅 Date: ${preferredDate}\n⏰ Time: ${preferredTime}\n💰 Total: Rs. ${totalPrice.toLocaleString()}\n\nYour booking has been sent to our system. We'll contact you shortly for confirmation!`,
      bookingId: bookingId
    };

  } catch (error) {
    console.error('❌ Webhook Booking Error:', error);
    return {
      success: false,
      message: `Error sending booking: ${error.message}`
    };
  }
}

// Initialize the WhatsApp client
const puppeteerConfig = {
  args: config.client.puppeteerArgs
};

// Add executablePath if specified in config
if (config.client.executablePath) {
  puppeteerConfig.executablePath = config.client.executablePath;
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: config.client.sessionPath
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018939634-alpha.html',
  },
  puppeteer: puppeteerConfig
});

// Store for scheduled message intervals
const scheduledMessages = new Map();

// Initialize the bot
console.log(`🤖 Starting WhatsApp Bot (PID: ${process.pid})...`);

// Generate QR Code for authentication
client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log('\n⏳ Waiting for QR code scan...\n');
});

// Client is ready
client.on('ready', async () => {
  console.log('✅ WhatsApp Bot is ready!');
  console.log('📞 Connected as:', client.info.pushname);
  console.log('📱 Phone:', client.info.wid.user);
  console.log('━'.repeat(50));

  // Safety patch for the 'markedUnread' error
  try {
    await client.pupPage.evaluate(() => {
      if (window.WWebJS && window.WWebJS.sendSeen) {
        const originalSendSeen = window.WWebJS.sendSeen;
        window.WWebJS.sendSeen = async (chatId) => {
          try {
            return await originalSendSeen(chatId);
          } catch (e) {
            return true; // Ignore failures in marking as seen
          }
        };
      }
    });
  } catch (patchError) {
    console.warn('⚠️ Could not apply sendSeen patch (might not be needed):', patchError.message);
  }

  // Start automatic message sending if enabled
  if (config.autoSend.enabled) {
    startAutoSend();
  }

  if (config.autoReply.enabled) {
    console.log('✉️  Auto-reply is enabled');
  }

  console.log('\n💬 Bot is now listening for messages...\n');
});

// Handle authentication
client.on('authenticated', () => {
  console.log('🔐 Authentication successful!');
});

// Handle authentication failure
client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

// Handle disconnection
client.on('disconnected', (reason) => {
  console.log('⚠️  Client was disconnected:', reason);
  // Clear all scheduled messages
  scheduledMessages.forEach(interval => clearInterval(interval));
  scheduledMessages.clear();
});

// Handle incoming messages
client.on('message', async (message) => {
  // Prevent duplicate processing
  if (processedMessages.has(message.id._serialized)) return;
  processedMessages.add(message.id._serialized);

  try {
    // Get contact info
    const chat = await message.getChat();
    const contact = await message.getContact();
    const customerInfo = {
      name: contact.name || contact.pushname || 'Customer',
      number: message.from.split('@')[0] // Clean number
    };

    // Log message if enabled
    if (config.bot.logMessages) {
      console.log(`📨 Message from ${customerInfo.name} (${message.from}): ${message.body}`);
    }

    // Ignore if auto-reply is disabled
    if (!config.autoReply.enabled) return;

    // Ignore own messages
    if (config.bot.ignoreOwnMessages && message.fromMe) return;

    // Ignore broadcast messages if configured
    if (config.bot.ignoreBroadcast && message.from === 'status@broadcast') return;

    // Group Message Handling
    if (message.from.endsWith('@g.us')) {
      if (config.bot.ignoreGroups) return; // Completely ignore if configured

      // Check if bot is mentioned
      const mentions = await message.getMentions();
      const isMentioned = mentions.some(contact => contact.id._serialized === client.info.wid._serialized);

      // Check if replying to bot
      let isReplyingToBot = false;
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (quotedMsg.author === client.info.wid._serialized || quotedMsg.fromMe) {
          isReplyingToBot = true;
        }
      }

      // If not mentioned and not replying to bot, ignore group message
      if (!isMentioned && !isReplyingToBot) {
        return;
      }

      console.log('🔔 Bot mentioned or replied to in group. Processing...');
    }

    // Check for keyword matches
    const messageBody = message.body.toLowerCase();
    let replied = false;

    // AI Auto-Reply Logic
    if (config.aiBot && config.aiBot.enabled) {
      try {
        console.log('🤖 AI processing message... (OpenAI)');

        let messages = [];

        // 1. Add System Prompt
        messages.push({ role: "system", content: config.aiBot.systemPrompt });

        // 2. Add Chat History (if enabled)
        if (historyManager) {
          const history = historyManager.getMessages(message.from);
          messages = messages.concat(history);
        }

        // 3. Add Current User Message
        const userMessage = { role: "user", content: message.body };
        messages.push(userMessage);

        // Define tools
        const tools = [
          {
            type: "function",
            function: {
              name: "book_appointment",
              description: "Book a car wash appointment with one or more services for a specific vehicle type. This will send the booking to the backend API.",
              parameters: {
                type: "object",
                properties: {
                  service_ids: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: Object.keys(config.services)
                    },
                    description: "Array of service IDs to book (e.g., ['wash_vacuum', 'engine_bay_clean']). Can also be a single service ID string."
                  },
                  vehicle_type: {
                    type: "string",
                    enum: Object.keys(config.vehicleTypes),
                    description: "The vehicle type (car_minivan, crossover, suv, or van)"
                  },
                  start_date_time: {
                    type: "string",
                    description: "ISO 8601 start time (e.g., 2026-01-30T10:30:00+05:30) or formatted as 'YYYY-MM-DD HH:MM'"
                  },
                  customer_name: {
                    type: "string",
                    description: "Customer's full name"
                  },
                  phone_number: {
                    type: "string",
                    description: "Customer mobile/phone number (e.g., 0771234567 or +94771234567)"
                  },
                  email: {
                    type: "string",
                    description: "Customer email address"
                  },
                  vehicle_number: {
                    type: "string",
                    description: "Vehicle registration number (e.g., ABC-1234)"
                  },
                  service_address: {
                    type: "string",
                    description: "Customer service/pickup address"
                  },
                },
                required: ["service_ids", "vehicle_type", "start_date_time", "customer_name", "phone_number", "email", "vehicle_number", "service_address"],
              },
            },
          }
        ];

        let loopCount = 0;
        const MAX_LOOPS = 5;
        let finalReplySent = false;

        while (loopCount < MAX_LOOPS && !finalReplySent) {
          loopCount++;

          const response = await openai.chat.completions.create({
            model: config.aiBot.model,
            messages: messages,
            tools: tools,
            tool_choice: "auto",
          }).catch(err => {
            console.error('DEBUG OpenAI API Error:', err);
            throw err;
          });

          const responseMessage = response.choices[0].message;

          if (responseMessage.tool_calls) {
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
              const fnName = toolCall.function.name;
              const args = JSON.parse(toolCall.function.arguments);
              let toolResult;

              console.log(`🛠️ Executing tool: ${fnName}`);

              if (fnName === 'book_appointment') {
                const bookingData = {
                  serviceIds: args.service_ids,
                  vehicleType: args.vehicle_type,
                  startDateTime: args.start_date_time,
                  customerName: args.customer_name,
                  phoneNumber: args.phone_number,
                  email: args.email,
                  vehicleNumber: args.vehicle_number,
                  serviceAddress: args.service_address
                };

                const result = await sendBookingWebhook(bookingData, customerInfo, messages);
                toolResult = result.success ? result.message : result.message;
              } else {
                toolResult = "Unknown tool";
              }

              messages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: fnName,
                content: toolResult,
              });
            }
            // Loop continues to process tool results
          } else {
            // No tool calls, final response
            const aiReply = responseMessage.content;
            if (aiReply) {
              try {
                const chat = await message.getChat();
                await chat.sendMessage(aiReply);
                console.log('✅ AI replied:', aiReply);
              } catch (sendError) {
                console.error('❌ Error sending AI reply, trying client fallback:', sendError.message);
                await client.sendMessage(message.from, aiReply);
              }
              messages.push({ role: "assistant", content: aiReply });
              replied = true;
            }
            finalReplySent = true;
          }
        }

        // Save interaction to history logic
        if (historyManager) {
          // We need to verify what is new.
          // messages array:
          // 0: System
          // 1..H: Old History
          // H+1: User Message
          // H+2..: New Assistant/Tool Messages

          const historyLen = historyManager.getMessages(message.from).length;
          // We expect User Message to be at index (1 + historyLen), wait.
          // History from manager does NOT include system prompt.
          // So messages array has: [System, ...History, User, ...]
          // Length of History part is historyLen.
          // System is 1.
          // So User starts at 1 + historyLen.

          const newContent = messages.slice(1 + historyLen);

          for (const msg of newContent) {
            historyManager.addMessage(message.from, msg);
          }
        }

        replied = true;
      } catch (aiError) {
        console.error('❌ AI Error:', aiError.message);
        console.log('⚠️ Falling back to keyword/default reply...');
        if (!config.aiBot.fallbackToDefault) return;
      }
    }

    if (!replied) {
      for (const [keyword, response] of Object.entries(config.autoReply.keywords)) {
        if (messageBody.includes(keyword.toLowerCase())) {
          try {
            const chat = await message.getChat();
            await chat.sendMessage(response);
            console.log(`✅ Auto-replied with keyword: "${keyword}"`);
          } catch (sendError) {
            console.error('❌ Error sending keyword reply:', sendError.message);
            await client.sendMessage(message.from, response);
          }
          replied = true;
          break;
        }
      }
    }

    // Send default reply if no keyword matched and default reply is enabled
    if (!replied && config.autoReply.useDefaultReply) {
      try {
        const chat = await message.getChat();
        await chat.sendMessage(config.autoReply.defaultReply);
        console.log('✅ Auto-replied with default message');
      } catch (sendError) {
        console.error('❌ Error sending default reply:', sendError.message);
        await client.sendMessage(message.from, config.autoReply.defaultReply);
      }
    }

  } catch (error) {
    console.error('❌ Error handling message:', error);
  }
});

// Function to send a message
async function sendMessage(to, message) {
  try {
    await client.sendMessage(to, message);
    console.log(`✅ Message sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending message to ${to}:`, error);
    return false;
  }
}

// Function to start automatic message sending
function startAutoSend() {
  console.log('\n🚀 Starting automatic message sending...');

  config.autoSend.messages.forEach((msgConfig, index) => {
    const { to, message, schedule } = msgConfig;

    // Send immediately if configured
    if (schedule.immediate) {
      setTimeout(() => {
        sendMessage(to, message);
      }, 1000); // Small delay to ensure client is ready
    }

    // Schedule with delay
    if (schedule.delay > 0 || !schedule.immediate) {
      setTimeout(() => {
        sendMessage(to, message);

        // Set up interval if configured
        if (schedule.interval > 0) {
          const intervalId = setInterval(() => {
            sendMessage(to, message);
          }, schedule.interval);

          scheduledMessages.set(`msg_${index}`, intervalId);
          console.log(`⏰ Scheduled message ${index + 1} to repeat every ${schedule.interval}ms`);
        }
      }, schedule.delay);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down bot...');

  // Clear all scheduled messages
  scheduledMessages.forEach(interval => clearInterval(interval));
  scheduledMessages.clear();

  await client.destroy();
  console.log('✅ Bot stopped successfully');
  process.exit(0);
});

// Start the client
client.initialize();
