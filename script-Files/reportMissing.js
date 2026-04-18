function showRelevantFields() {
    const type = document.querySelector('.js-missing-type').value;
    const allFields = ['student_card', 'id_card', 'drivers_license', 'device', 'other_item'];

    // Hide all fields first
    allFields.forEach(f => {
        document.querySelector(`.js-field-${f}`).style.display = 'none';
    });
    document.querySelector('.js-email-field').style.display = 'none';

    if (!type) return;

    // Show relevant field
    document.querySelector(`.js-field-${type}`).style.display = 'block';

    // Show email field for everything except student card (student card uses student number)
    if (type !== 'student_card') {
        document.querySelector('.js-email-field').style.display = 'block';
    }
}

async function submitMissingReport() {
    const type = document.querySelector('.js-missing-type').value;

    if (!type) {
        alert('Please select what type of item you lost.');
        return;
    }

    let email = '';
    let extraData = {};

    if (type === 'student_card') {
        const studentNumber = document.querySelector('.js-missing-student-number').value.trim();
        if (!studentNumber || studentNumber.length !== 9 || !/^[0-9]+$/.test(studentNumber)) {
            alert('Please enter a valid 9-digit student number.');
            return;
        }
        email = `${studentNumber}@student.uj.ac.za`;
        extraData.Student_Number = studentNumber;

    } else if (type === 'id_card') {
        const idNumber = document.querySelector('.js-missing-id-number').value.trim();
        email = document.querySelector('.js-missing-email').value.trim();
        if (!idNumber) { alert('Please enter your ID number.'); return; }
        if (!email) { alert('Please enter your email address.'); return; }
        extraData.ID_Number = idNumber;

    } else if (type === 'drivers_license') {
        const licenseNumber = document.querySelector('.js-missing-license-number').value.trim();
        email = document.querySelector('.js-missing-email').value.trim();
        if (!licenseNumber) { alert('Please enter your license number.'); return; }
        if (!email) { alert('Please enter your email address.'); return; }
        extraData.License_Number = licenseNumber;

    } else if (type === 'device') {
        const deviceName = document.querySelector('.js-missing-device-name').value.trim();
        email = document.querySelector('.js-missing-email').value.trim();
        if (!deviceName) { alert('Please enter your device name.'); return; }
        if (!email) { alert('Please enter your email address.'); return; }
        extraData.Device_Name = deviceName;

    } else if (type === 'other_item') {
        const itemDesc = document.querySelector('.js-missing-item-desc').value.trim();
        email = document.querySelector('.js-missing-email').value.trim();
        if (!itemDesc) { alert('Please describe the item you lost.'); return; }
        if (!email) { alert('Please enter your email address.'); return; }
        extraData.Item_Description = itemDesc;
    }

    try {
        const response = await fetch('https://find-my-stuff-campus.onrender.com/api/report-missing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Item_Type: type, Email: email, ...extraData })
        });

        const result = await response.json();

        if (result.message) {
            alert('✅ Done! We will email you at ' + email + ' as soon as your item is found.');
            document.querySelector('.js-missing-type').value = '';
            showRelevantFields();
        } else {
            alert(result.error || 'Something went wrong. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Unable to connect to the server. Make sure the server is running.');
    }
}