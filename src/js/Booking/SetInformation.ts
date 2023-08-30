export default class SetInformation {

    private bookingContainer: HTMLElement;
    private informationContainer: HTMLFormElement;
    private informationDataElements: Array<HTMLElement> = [];

    constructor(bookingContainer: HTMLElement) {
        this.bookingContainer = bookingContainer;
        this.informationContainer = this.bookingContainer.querySelector('.booking-totals');
        this.informationDataElements = Array.from(this.informationContainer.querySelectorAll('[data-booking-information]'));
    }

    public applyInformation(data: object): void {
        this.informationDataElements.forEach((dataElement) => {
            const attributeValue = dataElement.getAttribute('data-booking-information');
            const valueContainer = dataElement.querySelector('.booking-total-value');

            // If night count - set total nigh count
            if (attributeValue === 'nightCount') {
                valueContainer.innerHTML = data['totalNights'].toString();
            } else if (attributeValue === 'totalNights' && data.hasOwnProperty(attributeValue)) {
                // if total nights - adjust span and sum
                dataElement.querySelector('span').innerHTML = data[attributeValue].toString();
                valueContainer.innerHTML = data['totalNightSum'].toString();
            } else if (attributeValue === 'totalGuests' && data.hasOwnProperty(attributeValue)) {
                // if total guests
                // -- if additional guest added - set span and total price
                if (data['totalGuests'] > data['defaultGuestCount']) {
                    const additionalGuests = data['totalGuests'] - data['defaultGuestCount'];
                    dataElement.style.display = 'flex';
                    dataElement.querySelector('span').innerHTML = additionalGuests.toString();
                    valueContainer.innerHTML = data['guestPrice'].toString();
                } else { // else hide if no additional guest added
                    dataElement.style.display = 'none';
                }
            } else if (attributeValue && data.hasOwnProperty(attributeValue)) {
                valueContainer.innerHTML = data[attributeValue].toString();
            }
        });
    }
}