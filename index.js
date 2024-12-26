const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const nodemailer = require('nodemailer');
const axios = require('axios');

// User state management
const userState = {};

// WhatsApp client initialization
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: null,
        headless: true,
        timeout: 60000,
    },
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'emmkash20@gmail.com',  // Your email
        pass: 'mjwq oiug wfxv vexl',   // App-specific password
    },
});

// Generate and send QR code via email
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code received, scan with your WhatsApp!');
    sendQRCodeViaEmail(qr);
});

function sendQRCodeViaEmail(qrCode) {
    const mailOptions = {
        from: 'emmkash20@gmail.com',
        to: 'dukekirera84@gmail.com',
        subject: 'WhatsApp Web QR Code for Authentication',
        text: 'Please scan the QR code below to authenticate the bot:',
        html: `<p>Please scan the QR code below to authenticate the bot:</p><pre>${qrCode}</pre>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('QR Code sent to email:', info.response);
        }
    });
}

// Client ready
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

// Handle disconnection
client.on('disconnected', (reason) => {
    console.error('Disconnected from WhatsApp:', reason);
    initializeClient();
});

// Initialize WhatsApp client
async function initializeClient() {
    try {
        await client.initialize();
    } catch (error) {
        console.error('Error initializing client. Retrying...', error);
        setTimeout(initializeClient, 5000);
    }
}

// Handle incoming messages
client.on('message', async (message) => {
    try {
        const content = message.body.toLowerCase().trim();
        const sender = message.from;

        if (!userState[sender]) {
            userState[sender] = { categorySelected: null, dealSelected: false, selectedDeal: null };
        }

        const state = userState[sender];
        const phoneRegex = /^(?:\+254|254|0)\d{9}$/;

        if (content === 'buy') {
            state.categorySelected = null;
            state.dealSelected = false;
            state.selectedDeal = null;

            message.reply(
                `🎄🎅 MERRY CHRISTMAS, 🎉 Welcome to Bingwa Sokoni Bot By Emmkash-Tech! Please choose a category by typing:
                - *1* for Data Deals
                - *2* for SMS Deals
                - *3* for Minutes Deals`
            );
        } else if (!state.categorySelected) {
            if (content === '1') {
                state.categorySelected = 'data';
                sendDealsMenu(message, 'data');
            } else if (content === '2') {
                state.categorySelected = 'sms';
                sendDealsMenu(message, 'sms');
            } else if (content === '3') {
                state.categorySelected = 'minutes';
                sendDealsMenu(message, 'minutes');
            } else {
                message.reply("Invalid selection. Type *buy* to start again.");
            }
        } else if (!state.dealSelected) {
            const deal = mapDeal(state.categorySelected, content);
            if (deal) {
                state.dealSelected = true;
                state.selectedDeal = deal;
                message.reply(`You selected: "${deal.description}"\n\nType *yes* to confirm or *no* to cancel.`);
            } else {
                message.reply('Invalid option. Please select a valid deal.');
            }
        } else if (content === 'yes') {
            message.reply('Please enter your phone number to proceed with payment 🥳✅');
        } else if (phoneRegex.test(content)) {
            const phoneNumber = formatPhoneNumber(content.trim());
            const { amount, description } = state.selectedDeal;

            try {
                await initiateStkPush(amount, phoneNumber);
                message.reply(`STK Push initiated for "${description}". Please enter your M-Pesa PIN to complete.`);
            } catch (error) {
                console.error('Error initiating STK Push:', error);
                message.reply('Error initiating payment. Please try again.');
            }
        } else {
            message.reply("I couldn't understand that. Type *buy* to start over.");
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Functions for deal menus, mapping, formatting phone number, and STK Push
function sendDealsMenu(message, category) {
    const menus = {
        data: `You selected *Data Deals*:\n1. 1GB @ Ksh 19 (1 hour)\n2. 1.5GB @ Ksh 50 (3 hours)\n3. 6GB @ Ksh 700 (7 days)`,
        sms: `You selected *SMS Deals*:\n1. 200 SMS @ Ksh 10\n2. 20 SMS @ Ksh 5\n3. 1000 SMS @ Ksh 30`,
        minutes: `You selected *Minutes Deals*:\n1. 34MIN @ Ksh 18\n2. 50MIN @ Ksh 51\n3. 100MIN @ Ksh 102`,
    };

    message.reply(menus[category] || 'Invalid category selected.');
}

function mapDeal(category, option) {
    const deals = {
        data: [{ id: '1', description: '1GB @ Ksh 19 (1 hour)', amount: 19 }], 
        sms: [{ id: '1', description: '200 SMS @ Ksh 10', amount: 10 }],
        minutes: [{ id: '1', description: '34MIN @ Ksh 18', amount: 18 }],
    };

    return deals[category]?.find((deal) => deal.id === option);
}

function formatPhoneNumber(number) {
    if (number.startsWith('254')) return `+${number}`;
    if (number.startsWith('0')) return `+254${number.slice(1)}`;
    return number;
}

async function initiateStkPush(amount, phoneNumber) {
    const API_USERNAME = '5iOsVi1JBm2fDQJl5LPD';
    const API_PASSWORD = 'vNxb1zHkPV2tYro4SgRDXhTtWBEr8R46EQiBUvkD';
    const stk_push_url = 'https://backend.payhero.co.ke/api/v2/payments';

    const payload = {
        amount,
        phone_number: phoneNumber,
        channel_id: 852,
        provider: 'm-pesa',
        external_reference: 'INV-009',
        callback_url: 'https://softcash.co.ke/billing/callbackurl.php',
    };

    const response = await axios.post(stk_push_url, payload, {
        auth: { username: API_USERNAME, password: API_PASSWORD },
        headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    client.destroy().then(() => {
        process.exit(0);
    }).catch((err) => {
        console.error('Error shutting down client:', err);
        process.exit(1);
    });
});
