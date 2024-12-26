const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const nodemailer = require('nodemailer');
const axios = require('axios');
const express = require('express');

// Store user states in a simple object, with basic cleaning after inactivity
const userState = {};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: null,
        headless: true,
        timeout: 60000,
    },
});

// Initialize nodemailer transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'emmkash20@gmail.com',
        pass: 'mjwq oiug wfxv vexl',
    },
});

// Handle QR code generation and email
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
            console.log('Error sending email:', error);
        } else {
            console.log('QR Code sent to email: ' + info.response);
        }
    });
}

// Handle client ready event
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

// Handle disconnection and reconnection
client.on('disconnected', async (reason) => {
    console.log('Disconnected from WhatsApp. Reconnecting...', reason);
    await client.destroy(); 
    initializeClient(); // Reinitialize the client
});

async function initializeClient() {
    try {
        await client.initialize();
    } catch (error) {
        console.error('Error initializing client. Retrying...', error);
        setTimeout(initializeClient, 5000); // Retry after 5 seconds
    }
}

initializeClient(); // Start the client initialization

// Handle incoming messages
client.on('message', async (message) => {
    try {
        const content = message.body.toLowerCase().trim();
        const sender = message.from;

        // Efficiently manage user state
        if (!userState[sender]) {
            userState[sender] = { categorySelected: null, dealSelected: false, selectedDeal: null };
        }

        console.log('Message received:', content);

        // Phone number regex
        const phoneRegex = /^(?:\+254|254|0)\d{9}$/;

        // Handle buy command
        if (content.includes('buy')) {
            userState[sender] = { categorySelected: null, dealSelected: false, selectedDeal: null };
            message.reply(
                `🎄🎅 MERRY CHRISTMAS ,🎉 Welcome to Bingwa Sokoni Bot By Emmkash-Tech! Please choose a category by typing:
                - *1* for Data Deals
                - *2* for SMS Deals
                - *3* for Minutes Deals`
            );
        }
        // Category selection
        else if (!userState[sender].categorySelected) {
            if (['1', '2', '3'].includes(content)) {
                userState[sender].categorySelected = content;
                sendDealsMenu(message, content);
            } else {
                message.reply("Invalid selection. Type *buy* to start again.");
            }
        }
        // Deal selection
        else if (!userState[sender].dealSelected) {
            const selectedCategory = userState[sender].categorySelected;
            const deal = mapDeal(selectedCategory, content);
            if (deal) {
                userState[sender].dealSelected = true;
                userState[sender].selectedDeal = deal;
                message.reply(
                    `You selected: "${deal.description}"\n\nType *yes* to confirm or *no* to cancel.`
                );
            } else {
                message.reply('Invalid option. Please select a valid deal.');
            }
        }
        // Handle confirmation
        else if (content === 'yes') {
            message.reply('Please enter your phone number to proceed with the payment🥳✅');
        }
        // Phone number handling
        else if (phoneRegex.test(content)) {
            const phoneNumber = formatPhoneNumber(content);
            const { amount, description } = userState[sender].selectedDeal;

            try {
                const stkPushResponse = await initiateStkPush(amount, phoneNumber);
                message.reply(`STK Push initiated for "${description}". Please enter your M-Pesa PIN to complete.`);
            } catch (error) {
                console.error(error);
                message.reply('Error initiating payment. Please try again.');
            }
        } else {
            message.reply("I couldn't understand that. Please select a valid option or type *buy* to start over.");
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

function sendDealsMenu(message, category) {
    const menus = {
        1: `You have selected *Data Deals*...`,
        2: `You have selected *SMS Deals*...`,
        3: `You have selected *Minutes Deals*...`,
    };
    message.reply(menus[category] || 'Invalid category selected.');
}

function mapDeal(category, option) {
    const deals = {
        1: [{ id: '1', description: '1GB @ Ksh 19 (1 hour)', amount: 19 }],
        2: [{ id: '1', description: '200 SMS @ Ksh 10 (24 hours)', amount: 10 }],
        3: [{ id: '1', description: '34MIN @ Ksh 18 (midnight)', amount: 18 }],
    };

    return deals[category]?.find(deal => deal.id === option);
}

function formatPhoneNumber(number) {
    return number.startsWith('254') ? `+${number}` : `+254${number.slice(1)}`;
}

// STK Push function
async function initiateStkPush(amount, phoneNumber) {
    const API_USERNAME = '5iOsVi1JBm2fDQJl5LPD';
    const API_PASSWORD = 'vNxb1zHkPV2tYro4SgRDXhTtWBEr8R46EQiBUvkD';
    const stk_push_url = 'https://backend.payhero.co.ke/api/v2/payments';

    const payload = {
        amount: amount,
        phone_number: phoneNumber,
        channel_id: 852,
        provider: 'm-pesa',
        external_reference: 'INV-009',
        callback_url: 'https://softcash.co.ke/billing/callbackurl.php'
    };

    try {
        const response = await axios.post(stk_push_url, payload, {
            auth: { username: API_USERNAME, password: API_PASSWORD },
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        throw new Error('Failed to initiate STK Push');
    }
}
