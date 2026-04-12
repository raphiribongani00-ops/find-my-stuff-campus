async function addDevice() {
    const deviceName = document.querySelector('.js-devName').value.trim();
    const deviceType = document.querySelector('.js-devType').value.trim();
    const deviceLocation = document.querySelector('.js-devLoc').value;
    const dateFound = document.querySelector('.js-devDate').value;
    const photoFile = document.querySelector('.js-devPic').files[0];
    const submitButton = document.querySelector('.js-device');

    if (!deviceName || !deviceType || !deviceLocation) {
        alert('Please make sure to fill in all fields before submitting.');
        return;
    }
    if (!dateFound) {
        alert('Please select the date the device was found.');
        return;
    }
    if (!photoFile) {
        alert('Please upload a photo of the device.');
        return;
    }

    // File validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(photoFile.type)) {
        alert('Only JPG, PNG, or WEBP image files are allowed.');
        return;
    }
    if (photoFile.size > 5 * 1024 * 1024) {
        alert('Photo must be smaller than 5MB.');
        return;
    }

    const formData = new FormData();
    formData.append('Device_Name', deviceName);
    formData.append('Device_Type', deviceType);
    formData.append('Location', deviceLocation);
    formData.append('Date_Found', dateFound);
    formData.append('photo', photoFile);

    // Show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('http://localhost:3000/api/save-device', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.message) {
            alert('Device saved successfully!');
            document.querySelector('.js-devName').value = '';
            document.querySelector('.js-devType').value = '';
            document.querySelector('.js-devLoc').value = '';
            document.querySelector('.js-devDate').value = '';
            document.querySelector('.js-devPic').value = '';
        } else {
            alert('Something went wrong. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Unable to connect to the server. Make sure the server is running and try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
    }
}

document.querySelector('.js-device').addEventListener('click', addDevice);