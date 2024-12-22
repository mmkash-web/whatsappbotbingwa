const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Create a new client instance with LocalAuth to handle session storage
const client = new Client({
    authStrategy: new LocalAuth() // This will store session data locally
});

// Create an object to track user states
const userState = {};

client.on('qr', (qr) => {
    console.log('Scan the QR code below:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('error', (error) => {
    console.log('Error: ', error);
});

client.on('authenticated', () => {
    console.log('Authenticated with WhatsApp!');
});

client.on('auth_failure', (message) => {
    console.log('Authentication failed. Please scan the QR code again.');
});

client.on('disconnected', () => {
    console.log('Client disconnected.');
});

// Listen for incoming messages from WhatsApp
client.on('message', async (message) => {
    const content = message.body.toLowerCase().trim();
    const sender = message.from;

    // Initialize user state if not set
    if (!userState[sender]) {
        userState[sender] = {
            categorySelected: null,
            dealSelected: false,
            selectedDeal: null,
        };
    }

    console.log('Message received: ', content);  // Log the received message

    const phoneRegex = /^(\+254|0)?\d{9}$/;  // Regex to match Kenyan phone numbers
    let phoneNumber;

    if (content.includes('buy')) {
        // Display main menu with categories
        userState[sender].categorySelected = null;
        userState[sender].dealSelected = false;
        userState[sender].selectedDeal = null;

        message.reply(
            `🎄🎅 MERRY CHRISTMAS ,🎉 Welcome to Bingwa Sokoni Bot By Emmkash-Tech! Please choose a category by typing:
            - *1* for Data Deals
            - *2* for SMS Deals
            - *3* for Minutes Deals

            Just type the number to choose a category (e.g., *1* for Data).`
        );
    }
    else if (content === '1' && !userState[sender].categorySelected) {
        // Data deals menu
        userState[sender].categorySelected = 'data';
        message.reply(
            `You have selected *Data Deals*. Here are the available packages:

            1. 1.25GB @ Ksh 55 (valid till midnight)
            2. 2.5GB @ Ksh 300 (valid for 7 days)
            3. 1.5GB @ Ksh 50 (valid for 3 hours)
            4. 350MB @ Ksh 49 (valid for 7 days)
            5. 6GB @ Ksh 700 (valid for 7 days)
            6. 1GB @ Ksh 19 (valid for 1 hour)
            7. 250MB @ Ksh 20 (valid for 24 hours)
            8. 1GB @ Ksh 99 (valid for 24 hours)

            Please type the number corresponding to the deal (e.g., *1* for 1.25GB or *2* for 2.5GB).`
        );
    }
    else if (content === '2' && !userState[sender].categorySelected) {
        // SMS deals menu
        userState[sender].categorySelected = 'sms';
        message.reply(
            `You have selected *SMS Deals*. Here are the available packages:

            1. 1000 SMS @ Ksh 30 (valid for 7 days)
            2. 200 SMS @ Ksh 10 (valid for 24 hours)
            3. 20 SMS @ Ksh 5 (valid for 24 hours)

            Please type the number corresponding to the deal (e.g., *1* for 1000 SMS or *2* for 200 SMS).`
        );
    }
    else if (content === '3' && !userState[sender].categorySelected) {
        // Minutes deals menu
        userState[sender].categorySelected = 'minutes';
        message.reply(
            `You have selected *Minutes Deals*. Here are the available packages:

            1. 34MIN @ Ksh 18 (expiry: midnight)
            2. 50MIN @ Ksh 51
            3. 50 CREDO @ Ksh 21
            4. 100MIN @ Ksh 102 (valid for 2 days)
            5. 200MIN @ Ksh 250

            Please type the number corresponding to the deal (e.g., *1* for 34MIN or *2* for 50MIN).`
        );
    }
    else if ((content === '1' || content === '2' || content === '3' || content === '4' || content === '5' || content === '6' || content === '7' || content === '8') && userState[sender].categorySelected && !userState[sender].dealSelected) {
        // Handle valid deal selection for Data, SMS, or Minutes
        userState[sender].dealSelected = true;
        let amount, dealCategory, dealDescription;

        if (userState[sender].categorySelected === 'data') {
            // Data Deals
            if (content === '1') {
                amount = 55;  // Amount for 1.25GB
                dealCategory = 'Data';
                dealDescription = '1.25GB @ Ksh 55 (valid till midnight)';
            } else if (content === '2') {
                amount = 300;  // Amount for 2.5GB
                dealCategory = 'Data';
                dealDescription = '2.5GB @ Ksh 300 (valid for 7 days)';
            } else if (content === '8') {
                amount = 99;  // Amount for 1GB @ Ksh 99
                dealCategory = 'Data';
                dealDescription = '1GB @ Ksh 99 (valid for 24 hours)';
            }
            // Add other data deals...
        } else if (userState[sender].categorySelected === 'sms') {
            // SMS Deals
            if (content === '1') {
                amount = 30;  // Amount for 1000 SMS
                dealCategory = 'SMS';
                dealDescription = '1000 SMS @ Ksh 30 (valid for 7 days)';
            }
            // Add other SMS deals...
        } else if (userState[sender].categorySelected === 'minutes') {
            // Minutes Deals
            if (content === '1') {
                amount = 18;  // Amount for 34MIN
                dealCategory = 'Minutes';
                dealDescription = '34MIN @ Ksh 18 (expiry: midnight)';
            }
            // Add other minutes deals...
        }

        // Confirm the selected deal
        userState[sender].selectedDeal = {
            amount,
            dealCategory,
            dealDescription
        };

        message.reply(
            `You have selected the *${dealCategory} Deal*: 
            "${dealDescription}"

            Please confirm by typing *yes* to proceed or *no* to choose another deal.`
        );
    }
    else if (content === 'yes' && userState[sender].selectedDeal) {
        // If user confirms, ask for phone number
        message.reply('Please enter your phone number to proceed with the payment🥳✅ (KUMBUKA KUKUNUNUA NI MARA MOJA KWA SIKUU):');
    }
    else if (phoneRegex.test(content) && userState[sender].selectedDeal) {
        // If message matches phone number format, initiate payment
        phoneNumber = content.trim().startsWith('+') ? content.trim() : `+${content.trim()}`;
        console.log('Phone number received: ', phoneNumber); // Log the received phone number

        const { amount, dealCategory } = userState[sender].selectedDeal;

        // Initiate STK Push to PayHero API
        try {
            const response = await initiateStkPush(amount, phoneNumber);
            message.reply(`STK Push initiated for your *${dealCategory}* deal! Please enter your M-Pesa PIN to complete the transaction.`);
        } catch (error) {
            console.log('Error initiating payment:', error);
            message.reply('There was an error initiating the payment. Please try again later.');
        }
    } else {
        message.reply("I couldn't understand that. Please type *1* for Data, *2* for SMS, or *3* for Minutes to start the process.");
    }
});

// Function to initiate STK Push via PayHero API
async function initiateStkPush(amount, phoneNumber) {
    const API_USERNAME = '5iOsVi1JBm2fDQJl5LPD';
    const API_PASSWORD = 'vNxb1zHkPV2tYro4SgRDXhTtEJo2d0fU9qfw4';
    const API_SHORTCODE = '600996';
    const API_LANDING_PAGE_URL = 'https://www.emmkash.com';
    const API_LANDING_PAGE_BACK_URL = 'https://www.emmkash.com/callback';

    const payload = {
        phoneNumber: phoneNumber,
        amount: amount,
        shortcode: API_SHORTCODE,
        API_USERNAME: API_USERNAME,
        API_PASSWORD: API_PASSWORD,
        landingPageUrl: API_LANDING_PAGE_URL,
        landingPageBackUrl: API_LANDING_PAGE_BACK_URL
    };

    try {
        const response = await axios.post('https://api.payhero.io/v1/stkpush', payload);
        return response.data;
    } catch (error) {
        console.error('Error in STK push:', error);
        throw error;
    }
}

client.initialize();
