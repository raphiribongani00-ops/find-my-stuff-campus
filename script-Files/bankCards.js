async function addBankCard() {
    const cardNumber = document.querySelector('.js-bankCardNo').value.trim();
    const cardLocation = document.querySelector('.js-bankCardLoc').value;
    const dateFound = document.querySelector('.js-bankCardDate').value;
    const submitButton = document.querySelector('.js-bankCard');

    if (!cardNumber || !cardLocation) {
        alert('Please make sure to fill in all fields before submitting.');
        return;
    }
    if (!dateFound) {
        alert('Please select the date the card was found.');
        return;
    }
    if (!/^[0-9]+$/.test(cardNumber)) {
        alert('Card number should only contain digits.');
        return;
    }
    if (cardNumber.length !== 16) {
        alert('Please enter a valid card number (16 digits).');
        return;
    }

    // Show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const response = await fetch('http://localhost:3000/api/save-bank-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Card_Number: cardNumber, Location: cardLocation, Date_Found: dateFound })
        });
        const result = await response.json();
        if (result.message) {
            alert('Bank card saved successfully!');
            document.querySelector('.js-bankCardNo').value = '';
            document.querySelector('.js-bankCardLoc').value = '';
            document.querySelector('.js-bankCardDate').value = '';
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

document.querySelector('.js-bankCard').addEventListener('click', addBankCard);