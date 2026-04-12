async function addStudentcard() {
    const surnameInitials = document.querySelector('.js-surInit').value.trim();
    const studentNumber = document.querySelector('.js-stdNo').value.trim();
    const studentcardLocation = document.querySelector('.js-stdLoc').value;
    const dateFound = document.querySelector('.js-stdDate').value;
    const photoFile = document.querySelector('.js-stdPhoto').files[0];
    const submitButton = document.querySelector('.js-studentCard');

    if (!surnameInitials || !studentNumber || !studentcardLocation) {
        alert('Please make sure to fill in all fields before submitting.');
        return;
    }
    if (!dateFound) {
        alert('Please select the date the card was found.');
        return;
    }
    if (!photoFile) {
        alert('Please upload a photo for the student card.');
        return;
    }
    if (!/^[a-zA-Z\s]+$/.test(surnameInitials)) {
        alert('Surname and initials should only contain letters and spaces.');
        return;
    }
    if (!/^[0-9]+$/.test(studentNumber)) {
        alert('Student number should only contain digits.');
        return;
    }
    if (studentNumber.length !== 9) {
        alert('Please enter a valid UJ student number (9 digits).');
        return;
    }

    // Check enrollment year — first 2 digits should be a realistic year
    const yearPrefix = parseInt(studentNumber.substring(0, 2));
    const currentYear = new Date().getFullYear() % 100;
    if (yearPrefix < 95 && yearPrefix > currentYear) {
        alert('Please enter a valid UJ student number. The first 2 digits should be your enrollment year e.g. 22 for 2022.');
        return;
    }

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
    formData.append('Surname_Initials', surnameInitials);
    formData.append('Student_Number', studentNumber);
    formData.append('Location', studentcardLocation);
    formData.append('Date_Found', dateFound);
    formData.append('photo', photoFile);

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('http://localhost:3000/api/save-student-card', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.message) {
            // Check if there was an email warning (bounce detected)
            if (result.emailWarning) {
                alert('⚠️ Card saved, but: ' + result.emailWarning);
            } else if (result.emailStatus === 'sent') {
                alert('✅ Student card saved and the student has been notified by email!');
            } else {
                alert('Student card saved successfully!');
            }

            // Clear form fields
            document.querySelector('.js-surInit').value = '';
            document.querySelector('.js-stdNo').value = '';
            document.querySelector('.js-stdLoc').value = '';
            document.querySelector('.js-stdDate').value = '';
            document.querySelector('.js-stdPhoto').value = '';
        } else {
            alert('Something went wrong. Please try again.');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Unable to connect to the server. Make sure the server is running and try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Card';
    }
}