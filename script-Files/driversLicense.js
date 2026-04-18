async function addDriversLicense() {
    const fullName = document.querySelector('.js-dlFullName').value.trim();
    const licenseNumber = document.querySelector('.js-dlNumber').value.trim();
    const location = document.querySelector('.js-dlLoc').value;
    const dateFound = document.querySelector('.js-dlDate').value;
    const photoFile = document.querySelector('.js-dlPhoto').files[0];
    const submitButton = document.querySelector('.js-driversLicense');

    if (!fullName || !licenseNumber || !location) {
        alert('Please fill in all fields before submitting.');
        return;
    }
    if (!dateFound) {
        alert('Please select the date the license was found.');
        return;
    }
    if (!photoFile) {
        alert('Please upload a photo of the driver\'s license.');
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
    formData.append('License_Number', licenseNumber);
    formData.append('Location', location);
    formData.append('Date_Found', dateFound);
    formData.append('photo', photoFile);

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('https://find-my-stuff-campus.onrender.com/api/save-drivers-license', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.message) {
            alert('Driver\'s license saved successfully!');
            document.querySelector('.js-dlFullName').value = '';
            document.querySelector('.js-dlNumber').value = '';
            document.querySelector('.js-dlLoc').value = '';
            document.querySelector('.js-dlDate').value = '';
            document.querySelector('.js-dlPhoto').value = '';
        } else {
            alert('Something went wrong. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Unable to connect to the server. Make sure the server is running.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Driver\'s License';
    }
}

document.querySelector('.js-driversLicense').addEventListener('click', addDriversLicense);