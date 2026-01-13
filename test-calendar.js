const { google } = require('googleapis');
const config = require('./config');
require('dotenv').config();

async function testCalendar() {
    console.log('🧪 Starting Calendar API Test (Verifying Fix)...');

    const auth = new google.auth.GoogleAuth({
        keyFile: config.aiBot.calendar.credentialsPath,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    });
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = config.aiBot.calendar.calendarId;

    // 1b. Check Allowed Conference Types
    try {
        const calendarMeta = await calendar.calendars.get({ calendarId: calendarId });
        console.log('\n🕵️  Calendar Capabilities:');
        console.log('   Allowed Conference Types:', JSON.stringify(calendarMeta.data.conferenceProperties?.allowedConferenceSolutionTypes || 'None listed', null, 2));
    } catch (err) {
        console.log('   Could not fetch calendar metadata:', err.message);
    }

    console.log('\n💇 Testing Salon Appointment Logic...');
    try {
        const serviceKey = 'haircut';
        const service = config.services[serviceKey];
        if (!service) throw new Error('Service not found in config');

        console.log(`   Booking Service: ${service.name} (${service.duration} mins)`);

        const start = new Date();
        start.setMinutes(start.getMinutes() + 120); // 2 hours from now
        const end = new Date(start.getTime() + service.duration * 60000);

        const event = {
            summary: `${service.name} for Test Customer`,
            description: `Service: ${service.name}\nDuration: ${service.duration} mins\nPrice: ${service.price} LKR\nBooked via Test Script.`,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            attendees: [],
        };

        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
        });

        console.log('✅ Appointment Booked!');
        console.log(`   Event ID: ${response.data.id}`);
        console.log(`   Event URL: ${response.data.htmlLink}`);
    } catch (error) {
        console.error('❌ Failed:', error.message);
        if (error.response) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testCalendar();
