async function addOtherItem() {
    const itemDesc = document.querySelector('.js-itemDesc').value.trim();
    const itemColor = document.querySelector('.js-itemColor').value.trim();
    const itemLocation = document.querySelector('.js-itemLoc').value;
    const dateFound = document.querySelector('.js-itemDate').value;
    const photoFile = document.querySelector('.js-itemPic').files[0];
    const submitButton = document.querySelector('.js-otherItem');

    if (!itemDesc || !itemColor || !itemLocation) {
        alert('Please make sure to fill in all fields before submitting.');
        return;
    }
    if (!dateFound) {
        alert('Please select the date the item was found.');
        return;
    }
    if (!photoFile) {
        alert('Please upload a photo of the item.');
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
    formData.append('Item_Description', itemDesc);
    formData.append('Color', itemColor);
    formData.append('Location', itemLocation);
    formData.append('Date_Found', dateFound);
    formData.append('photo', photoFile);

    // Show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('http://localhost:3000/api/save-item', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.message) {
            alert('Item saved successfully!');
            document.querySelector('.js-itemDesc').value = '';
            document.querySelector('.js-itemColor').value = '';
            document.querySelector('.js-itemLoc').value = '';
            document.querySelector('.js-itemDate').value = '';
            document.querySelector('.js-itemPic').value = '';
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

document.querySelector('.js-otherItem').addEventListener('click', addOtherItem);