require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());


// ── MONGODB CONNECTION ──
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ── SCHEMAS ──
const studentCardSchema = new mongoose.Schema({
    Surname_Initials: String,
    Student_Number: String,
    Location: String,
    Date_Found: String,
    photo: String,
    emailDelivered: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

const idCardSchema = new mongoose.Schema({
    Full_Name: String,
    ID_Number: String,
    Location: String,
    Date_Found: String,
    photo: String,
    timestamp: { type: Date, default: Date.now }
});

const driversLicenseSchema = new mongoose.Schema({
    Full_Name: String,
    License_Number: String,
    Location: String,
    Date_Found: String,
    photo: String,
    timestamp: { type: Date, default: Date.now }
});

const deviceSchema = new mongoose.Schema({
    Device_Name: String,
    Device_Type: String,
    Location: String,
    Date_Found: String,
    photo: String,
    timestamp: { type: Date, default: Date.now }
});

const itemSchema = new mongoose.Schema({
    Item_Description: String,
    Color: String,
    Location: String,
    Date_Found: String,
    photo: String,
    timestamp: { type: Date, default: Date.now }
});

const bankCardSchema = new mongoose.Schema({
    Card_Number: String,
    Location: String,
    Date_Found: String,
    timestamp: { type: Date, default: Date.now }
});

const missingReportSchema = new mongoose.Schema({
    Item_Type: String,
    Email: String,
    Student_Number: String,
    ID_Number: String,
    License_Number: String,
    Device_Name: String,
    Item_Description: String,
    timestamp: { type: Date, default: Date.now }
});

// ── MODELS ──
const StudentCard = mongoose.model('StudentCard', studentCardSchema);
const IdCard = mongoose.model('IdCard', idCardSchema);
const DriversLicense = mongoose.model('DriversLicense', driversLicenseSchema);
const Device = mongoose.model('Device', deviceSchema);
const Item = mongoose.model('Item', itemSchema);
const BankCard = mongoose.model('BankCard', bankCardSchema);
const MissingReport = mongoose.model('MissingReport', missingReportSchema);

// ── EMAIL SETUP ──
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail(to, subject, html) {
    const info = await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
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
                <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#0a5e56;color:white;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold;margin-top:8px;">View on Find My Stuff Campus</a>
            </div>
            <div style="background:#f8f9fa;padding:20px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="color:#6b7280;font-size:13px;margin:0;">This is an automated message from Find My Stuff Campus.<br>University of Johannesburg · © 2026</p>
            </div>
        </div>`;
}

// ── CHECK MISSING REPORTS & NOTIFY ──
async function checkAndNotify(itemType, identifierKey, identifierValue, location, dateFound) {
    const matches = await MissingReport.find({ Item_Type: itemType, [identifierKey]: identifierValue });

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
// ── CLOUDINARY + MULTER ──
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'find-my-stuff-campus',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        transformation: [{ width: 800, crop: 'limit' }]
    }
});
const upload = multer({ storage });

// ── STUDENT CARDS ──
app.post('/api/save-student-card', upload.single('photo'), async (req, res) => {
    const { Surname_Initials, Student_Number, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.path : null;

    const newCard = await StudentCard.create({ Surname_Initials, Student_Number, Location, Date_Found, photo: photoPath });

    let emailStatus = 'failed';
    let emailWarning = null;

    try {
        const studentEmail = `${Student_Number}@student.uj.ac.za`;
        const details = `
            <p style="margin:0 0 8px;color:#374151;"><strong>📍 Location found:</strong> ${Location}</p>
            <p style="margin:0 0 8px;color:#374151;"><strong>📅 Date found:</strong> ${Date_Found}</p>
            <p style="margin:0;color:#374151;"><strong>🪪 Student number:</strong> ${Student_Number}</p>`;

        await sendEmail(studentEmail, '📬 Your Student Card Has Been Found — Find My Stuff Campus', foundItemEmailHtml(`Good news, ${Surname_Initials}! 🎉 Your student card has been found.`, details));

        emailStatus = 'sent';
        await StudentCard.findByIdAndUpdate(newCard._id, { emailDelivered: true });

    } catch (emailError) {
        console.error('Email failed or bounced:', emailError.message);
        if (emailError.message.includes('550') || emailError.message.includes('551') || emailError.message.includes('553') || emailError.message.includes('invalid')) {
            emailWarning = 'The student number you entered may be incorrect — the email could not be delivered. Please double-check the student number on the card.';
        } else {
            emailWarning = 'The card was saved but the notification email could not be sent right now.';
        }
    }

    await checkAndNotify('student_card', 'Student_Number', Student_Number, Location, Date_Found);
    res.json({ message: 'Student card saved!', card: newCard, emailStatus, emailWarning });
});

app.get('/api/get-student-cards', async (req, res) => {
    const cards = await StudentCard.find().sort({ timestamp: -1 });
    res.json(cards);
});

// ── ID CARDS ──
app.post('/api/save-id-card', upload.single('photo'), async (req, res) => {
    const { Full_Name, ID_Number, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.path : null;

    const newCard = await IdCard.create({ Full_Name, ID_Number, Location, Date_Found, photo: photoPath });
    await checkAndNotify('id_card', 'ID_Number', ID_Number, Location, Date_Found);
    res.json({ message: 'ID card saved!', card: newCard });
});

app.get('/api/get-id-cards', async (req, res) => {
    const cards = await IdCard.find().sort({ timestamp: -1 });
    res.json(cards);
});

// ── DRIVER'S LICENSES ──
app.post('/api/save-drivers-license', upload.single('photo'), async (req, res) => {
    const { Full_Name, License_Number, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.path : null;

    const newLicense = await DriversLicense.create({ Full_Name, License_Number, Location, Date_Found, photo: photoPath });
    await checkAndNotify('drivers_license', 'License_Number', License_Number, Location, Date_Found);
    res.json({ message: "Driver's license saved!", license: newLicense });
});

app.get('/api/get-drivers-licenses', async (req, res) => {
    const licenses = await DriversLicense.find().sort({ timestamp: -1 });
    res.json(licenses);
});

// ── DEVICES ──
app.post('/api/save-device', upload.single('photo'), async (req, res) => {
    const { Device_Name, Device_Type, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.path : null;

    const newDevice = await Device.create({ Device_Name, Device_Type, Location, Date_Found, photo: photoPath });
    await checkAndNotify('device', 'Device_Name', Device_Name, Location, Date_Found);
    res.json({ message: 'Device saved!', device: newDevice });
});

app.get('/api/get-devices', async (req, res) => {
    const devices = await Device.find().sort({ timestamp: -1 });
    res.json(devices);
});

// ── OTHER ITEMS ──
app.post('/api/save-item', upload.single('photo'), async (req, res) => {
    const { Item_Description, Color, Location, Date_Found } = req.body;
    const photoPath = req.file ? req.file.path : null;

    const newItem = await Item.create({ Item_Description, Color, Location, Date_Found, photo: photoPath });
    await checkAndNotify('other_item', 'Item_Description', Item_Description, Location, Date_Found);
    res.json({ message: 'Item saved!', item: newItem });
});

app.get('/api/get-items', async (req, res) => {
    const items = await Item.find().sort({ timestamp: -1 });
    res.json(items);
});

// ── BANK CARDS ──
app.post('/api/save-bank-card', async (req, res) => {
    const { Card_Number, Location, Date_Found } = req.body;
    const newCard = await BankCard.create({ Card_Number, Location, Date_Found });
    res.json({ message: 'Bank card saved!', card: newCard });
});

app.get('/api/get-bank-cards', async (req, res) => {
    const cards = await BankCard.find().sort({ timestamp: -1 });
    res.json(cards);
});

// ── MISSING REPORTS ──
app.post('/api/report-missing', async (req, res) => {
    const { Item_Type, Email, Student_Number, ID_Number, License_Number, Device_Name, Item_Description } = req.body;

    if (!Item_Type || !Email) {
        return res.status(400).json({ error: 'Item type and email are required.' });
    }

    const newReport = await MissingReport.create({
        Item_Type, Email,
        Student_Number: Student_Number || null,
        ID_Number: ID_Number || null,
        License_Number: License_Number || null,
        Device_Name: Device_Name || null,
        Item_Description: Item_Description || null
    });

    res.json({ message: 'Missing report saved! We will notify you when your item is found.' });
});

// ── START SERVER ──
const PORT = process.env.PORT || 3000;
// ── ADMIN DELETE ROUTES ──
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function checkAdmin(req, res, next) {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

app.delete('/api/admin/student-card/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    await StudentCard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

app.delete('/api/admin/id-card/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    await IdCard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

app.delete('/api/admin/drivers-license/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    await DriversLicense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

app.delete('/api/admin/device/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    await Device.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

app.delete('/api/admin/item/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

app.delete('/api/admin/bank-card/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    await BankCard.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));