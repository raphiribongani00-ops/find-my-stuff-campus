const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── EMAIL SETUP ──
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'raphiribongani00@gmail.com',
        pass: 'jozc yxyx xcsi nejd'
    }
});

async function sendEmail(to, subject, html) {
    const info = await transporter.sendMail({ from: 'raphiribongani00@gmail.com', to, subject, html });
    console.log(`Email sent to ${to}`);
    return info;
}

function foundItemEmailHtml(title, details) {
    return `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0a5e56;padding:32px;text-align:center;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:24px;">Find My Stuff Campus</h1>
                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">University of Johannesburg</p>
            </div>
            <div style="background:white;padding:32px;border:1px solid #e2e8f0;">
                <h2 style="color:#111827;margin-top:0;">${title}</h2>
                <div style="background:#f0f9f8;border-left:4px solid #0a5e56;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
                    ${details}
                </div>
                <p style="color:#374151;line-height:1.6;">Please go to the campus safekeeping at the location above to collect your item. Bring your ID when collecting.</p>
                <a href="http://localhost:3000" style="display:inline-block;background:#0a5e56;color:white;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:8px;">View on Find My Stuff Campus</a>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="color:#6b7280;font-size:13px;margin:0;">This is an automated message from Find My Stuff Campus.<br>University of Johannesburg · © 2026</p>
            </div>
        </div>`;
}

// ── CHECK MISSING REPORTS & NOTIFY ──
async function checkAndNotify(itemType, identifierKey, identifierValue, location, dateFound) {
    if (!fs.existsSync('missingReports.json')) return;
    const reports = JSON.parse(fs.readFileSync('missingReports.json'));
    const matches = reports.filter(r => r.Item_Type === itemType && r[identifierKey] === identifierValue);

    for (const match of matches) {
        const details = `
            <p style="margin:0 0 8px;color:#374151;"><strong>📍 Location found:</strong> ${location}</p>
            <p style="margin:0 0 8px;color:#374151;"><strong>📅 Date found:</strong> ${dateFound}</p>
            <p style="margin:0;color:#374151;"><strong>🔑 Identifier:</strong> ${identifierValue}</p>`;
        try {
            await sendEmail(match.Email, '📬 Your Lost Item Has Been Found — Find My Stuff Campus', foundItemEmailHtml('Good news! Your item has been found! 🎉', details));
        } catch (e) {
            console.error('Notify email failed:', e.message);
        }
    }
}

// ── MULTER ──
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// ── STUDENT CARDS ──
app.post('/api/save-student-card', upload.single('photo'), async (req, res) => {
    const { Surname_Initials, Student_Number, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.filename : null;

    let cards = [];
    if (fs.existsSync('studentCards.json')) cards = JSON.parse(fs.readFileSync('studentCards.json'));

    const newCard = {
        id: Date.now(),
        Surname_Initials,
        Student_Number,
        Location,
        Date_Found,
        photo: photoPath,
        emailDelivered: false,
        timestamp: new Date().toISOString()
    };

    cards.push(newCard);
    fs.writeFileSync('studentCards.json', JSON.stringify(cards, null, 2));

    // Try to send email and detect bounce/failure
    let emailStatus = 'failed';
    let emailWarning = null;

    try {
        const studentEmail = `${Student_Number}@student.uj.ac.za`;
        const details = `
            <p style="margin:0 0 8px;color:#374151;"><strong>📍 Location found:</strong> ${Location}</p>
            <p style="margin:0 0 8px;color:#374151;"><strong>📅 Date found:</strong> ${Date_Found}</p>
            <p style="margin:0;color:#374151;"><strong>🪪 Student number:</strong> ${Student_Number}</p>`;

        await sendEmail(
            studentEmail,
            '📬 Your Student Card Has Been Found — Find My Stuff Campus',
            foundItemEmailHtml(`Good news, ${Surname_Initials}! 🎉 Your student card has been found.`, details)
        );

        // Email was accepted by the server — mark as delivered
        emailStatus = 'sent';

        // Update the card record to mark email as delivered
        let updatedCards = JSON.parse(fs.readFileSync('studentCards.json'));
        updatedCards = updatedCards.map(c =>
            c.id === newCard.id ? { ...c, emailDelivered: true } : c
        );
        fs.writeFileSync('studentCards.json', JSON.stringify(updatedCards, null, 2));

    } catch (emailError) {
        console.error('Email failed or bounced:', emailError.message);
        emailStatus = 'failed';

        // Check if it's a rejection (invalid address / bounce)
        if (
            emailError.message.includes('550') ||   // mailbox not found
            emailError.message.includes('551') ||   // user not local
            emailError.message.includes('553') ||   // mailbox name invalid
            emailError.message.includes('invalid')  // general invalid
        ) {
            emailWarning = 'The student number you entered may be incorrect — the email could not be delivered. Please double-check the student number on the card.';
        } else {
            emailWarning = 'The card was saved but the notification email could not be sent right now. Please check your internet connection.';
        }
    }

    // Also check missing reports
    await checkAndNotify('student_card', 'Student_Number', Student_Number, Location, Date_Found);

    res.json({
        message: 'Student card saved!',
        card: newCard,
        emailStatus,
        emailWarning
    });
});

app.get('/api/get-student-cards', (req, res) => {
    res.json(fs.existsSync('studentCards.json') ? JSON.parse(fs.readFileSync('studentCards.json')) : []);
});

// ── ID CARDS ──
app.post('/api/save-id-card', upload.single('photo'), async (req, res) => {
    const { Full_Name, ID_Number, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.filename : null;

    let cards = [];
    if (fs.existsSync('idCards.json')) cards = JSON.parse(fs.readFileSync('idCards.json'));

    const newCard = { id: Date.now(), Full_Name, ID_Number, Location, Date_Found, photo: photoPath, timestamp: new Date().toISOString() };
    cards.push(newCard);
    fs.writeFileSync('idCards.json', JSON.stringify(cards, null, 2));

    await checkAndNotify('id_card', 'ID_Number', ID_Number, Location, Date_Found);

    res.json({ message: 'ID card saved!', card: newCard });
});

app.get('/api/get-id-cards', (req, res) => {
    res.json(fs.existsSync('idCards.json') ? JSON.parse(fs.readFileSync('idCards.json')) : []);
});

// ── DRIVER'S LICENSES ──
app.post('/api/save-drivers-license', upload.single('photo'), async (req, res) => {
    const { Full_Name, License_Number, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.filename : null;

    let licenses = [];
    if (fs.existsSync('driversLicenses.json')) licenses = JSON.parse(fs.readFileSync('driversLicenses.json'));

    const newLicense = { id: Date.now(), Full_Name, License_Number, Location, Date_Found, photo: photoPath, timestamp: new Date().toISOString() };
    licenses.push(newLicense);
    fs.writeFileSync('driversLicenses.json', JSON.stringify(licenses, null, 2));

    await checkAndNotify('drivers_license', 'License_Number', License_Number, Location, Date_Found);

    res.json({ message: "Driver's license saved!", license: newLicense });
});

app.get('/api/get-drivers-licenses', (req, res) => {
    res.json(fs.existsSync('driversLicenses.json') ? JSON.parse(fs.readFileSync('driversLicenses.json')) : []);
});

// ── DEVICES ──
app.post('/api/save-device', upload.single('photo'), async (req, res) => {
    const { Device_Name, Device_Type, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.filename : null;

    let devices = [];
    if (fs.existsSync('devices.json')) devices = JSON.parse(fs.readFileSync('devices.json'));

    const newDevice = { id: Date.now(), Device_Name, Device_Type, Location, Date_Found, photo: photoPath, timestamp: new Date().toISOString() };
    devices.push(newDevice);
    fs.writeFileSync('devices.json', JSON.stringify(devices, null, 2));

    await checkAndNotify('device', 'Device_Name', Device_Name, Location, Date_Found);

    res.json({ message: 'Device saved!', device: newDevice });
});

app.get('/api/get-devices', (req, res) => {
    res.json(fs.existsSync('devices.json') ? JSON.parse(fs.readFileSync('devices.json')) : []);
});

// ── OTHER ITEMS ──
app.post('/api/save-item', upload.single('photo'), async (req, res) => {
    const { Item_Description, Color, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.filename : null;

    let items = [];
    if (fs.existsSync('items.json')) items = JSON.parse(fs.readFileSync('items.json'));

    const newItem = { id: Date.now(), Item_Description, Color, Location, Date_Found, photo: photoPath, timestamp: new Date().toISOString() };
    items.push(newItem);
    fs.writeFileSync('items.json', JSON.stringify(items, null, 2));

    await checkAndNotify('other_item', 'Item_Description', Item_Description, Location, Date_Found);

    res.json({ message: 'Item saved!', item: newItem });
});

app.get('/api/get-items', (req, res) => {
    res.json(fs.existsSync('items.json') ? JSON.parse(fs.readFileSync('items.json')) : []);
});

// ── BANK CARDS ──
app.post('/api/save-bank-card', (req, res) => {
    const { Card_Number, Location, Date_Found } = req.body;

    let bankCards = [];
    if (fs.existsSync('bankCards.json')) bankCards = JSON.parse(fs.readFileSync('bankCards.json'));

    const newBankCard = { id: Date.now(), Card_Number, Location, Date_Found, timestamp: new Date().toISOString() };
    bankCards.push(newBankCard);
    fs.writeFileSync('bankCards.json', JSON.stringify(bankCards, null, 2));

    res.json({ message: 'Bank card saved!', card: newBankCard });
});

app.get('/api/get-bank-cards', (req, res) => {
    res.json(fs.existsSync('bankCards.json') ? JSON.parse(fs.readFileSync('bankCards.json')) : []);
});

// ── MISSING REPORTS ──
app.post('/api/report-missing', (req, res) => {
    const { Item_Type, Email, Student_Number, ID_Number, License_Number, Device_Name, Item_Description } = req.body;

    if (!Item_Type || !Email) {
        return res.status(400).json({ error: 'Item type and email are required.' });
    }

    let reports = [];
    if (fs.existsSync('missingReports.json')) reports = JSON.parse(fs.readFileSync('missingReports.json'));

    const newReport = {
        id: Date.now(),
        Item_Type,
        Email,
        Student_Number: Student_Number || null,
        ID_Number: ID_Number || null,
        License_Number: License_Number || null,
        Device_Name: Device_Name || null,
        Item_Description: Item_Description || null,
        timestamp: new Date().toISOString()
    };

    reports.push(newReport);
    fs.writeFileSync('missingReports.json', JSON.stringify(reports, null, 2));

    res.json({ message: 'Missing report saved! We will notify you when your item is found.' });
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});