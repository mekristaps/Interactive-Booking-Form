import BookingApp from "./BookingApp";

document.addEventListener('DOMContentLoaded', () => {
    const bookingElements = document.querySelectorAll('[data-booking]');
    bookingElements.forEach((element) => {
        const bookingUrl = element.getAttribute('data-booking');
        if (bookingUrl) {
            //new Booking(bookingUrl, element);
            new BookingApp(bookingUrl, element as HTMLElement);
        }
    });
});