async function addIdCard() {
    const fullName = document.querySelector('.js-idFullName').value.trim();
    const idNumber = document.querySelector('.js-idNumber').value.trim();
    const location = document.querySelector('.js-idLoc').value;
    const dateFound = document.querySelector('.js-idDate').value;
    const photoFile = document.querySelector('.js-idPhoto').files[0];
    const submitButton = document.querySelector('.js-idCard');

    if (!fullName || !idNumber || !location) {
        alert('Please fill in all fields before submitting.');
        return;
    }
    if (!dateFound) {
        alert('Please select the date the ID card was found.');
        return;
    }
    if (!photoFile) {
        alert('Please upload a photo of the ID card.');
        return;
    }
    if (!/^[0-9]{13}$/.test(idNumber)) {
        alert('Please enter a valid 13-digit South African ID number.');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(photoFile.type)) {
        alert('Only JPG, PNG or WEBP images are allowed.');
        return;
    }
    if (photoFile.size > 5 * 1024 * 1024) {
        alert('Photo must be smaller than 5MB.');
        return;
    }

    const formData = new FormData();
    formData.append('Full_Name', fullName);
    formData.append('ID_Number', idNumber);
    formData.append('Location', location);
    formData.append('Date_Found', dateFound);
    formData.append('photo', photoFile);

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('https://find-my-stuff-campus.onrender.com/api/save-id-card', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.message) {
            alert('ID card saved successfully!');
            document.querySelector('.js-idFullName').value = '';
            document.querySelector('.js-idNumber').value = '';
            document.querySelector('.js-idLoc').value = '';
            document.querySelector('.js-idDate').value = '';
            document.querySelector('.js-idPhoto').value = '';
        } else {
            alert('Something went wrong. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Unable to connect to the server. Make sure the server is running.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit ID Card';
    }
}

document.querySelector('.js-idCard').addEventListener('click', addIdCard);