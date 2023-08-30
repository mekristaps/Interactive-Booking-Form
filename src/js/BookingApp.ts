import axios, {AxiosError, AxiosResponse} from "axios";
import dayjs, { Dayjs } from "dayjs";
import BookingForm from "./Booking/BookingForm";
import CalculatePrice from "./Booking/CalculatePrices";
import SetInformation from "./Booking/SetInformation";

export default class BookingApp {

    private bookingContainer: HTMLElement;
    private actionButtons: NodeListOf<HTMLButtonElement>;
    private roomContainer: NodeListOf<HTMLElement>;
    
    private bookingForm: BookingForm;
    private calculatePrice: CalculatePrice;
    private setInformation: SetInformation;

    private data: {
        apiUrl: string;
        activeStep: number;
        previousStep: number;
        selectedRoom: string;
        roomSettings: object;
        guestFullName: string;
        nightCount: number;
        guestCount: number;
        startDate: string;
        endDate: string;
        weekends: number;
        nonWeekendDays: number;
        weekendDates: { date: string; discount: number }[];
        nonWeekendDates: { date: string; discount: number }[];
    };

    private totalSums: object;

    constructor(apiUrl: string, element: HTMLElement) {
        this.bookingContainer = element;
        this.actionButtons = this.bookingContainer.querySelectorAll('[data-booking-action]');
        this.roomContainer = this.bookingContainer.querySelectorAll('[data-room]');
        this.calculatePrice = new CalculatePrice();
        this.setInformation = new SetInformation(this.bookingContainer);

        this.data = {
            apiUrl,
            activeStep: 1,
            previousStep: 1,
            selectedRoom: "",
            roomSettings: {},
            guestFullName: '',
            nightCount: 0,
            guestCount: 0,
            startDate: '',
            endDate: '',
            weekends: 0,
            nonWeekendDays: 0,
            weekendDates: [],
            nonWeekendDates: []
        };

        this.addEventListeners();
    }

    private addEventListeners(): void {

        this.actionButtons.forEach((formButton) => {
            formButton.addEventListener('click', (event) => {
                event.preventDefault();
                const clickedButton: HTMLElement = event.currentTarget as HTMLElement;
                const clickedAction: string = clickedButton.getAttribute('data-booking-action');
                const nextStepElement: HTMLElement = document.querySelector(`[data-step="${this.data.activeStep + 1}"]`);
                const previousStepElement: HTMLElement = document.querySelector(`[data-step="${this.data.activeStep - 1}"]`);

                // If room clicked, load settings
                if (clickedButton.hasAttribute('data-room')) {
                    this.data.selectedRoom = clickedButton.getAttribute('data-room');
                    clickedButton.classList.add('selected');
                    this.loadRoomSettings();
                }

                // If on room selection page
                const onRoomStep: boolean = this.bookingContainer.querySelector(".booking-room-select.active-step") !== null;
                if (onRoomStep) {
                    // Reset form
                    this.bookingContainer.querySelector("form").reset();
                }

                // If on form page
                const onFormStep: boolean = this.bookingContainer.querySelector("form.active-step") !== null;
                if (clickedAction === 'forward' && nextStepElement && onFormStep) {
                    if (this.bookingForm.validateForm()) {
                        this.toggleSteps(this.data.activeStep, this.data.activeStep + 1);
                        // Apply form data to variable
                        this.data.guestFullName = this.bookingForm.formData.guestFullName;
                        this.data.guestCount = this.bookingForm.formData.guestCount;
                        this.data.startDate = dayjs(this.bookingForm.formData.startDate).format("MM/DD/YYYY");
                        this.data.endDate = dayjs(this.bookingForm.formData.endDate).format("MM/DD/YYYY");
                        this.data.nightCount = this.bookingForm.formData.nightCount,
                        this.data.weekends = this.bookingForm.formData.weekends;
                        this.data.nonWeekendDays = this.bookingForm.formData.nonWeekendDays;
                        this.data.weekendDates = this.bookingForm.formData.weekendDates;
                        this.data.nonWeekendDates = this.bookingForm.formData.nonWeekendDates;
                        // Set variables needed for price calculation
                        const calculationData = {
                            guestCount: this.data.guestCount,
                            defaultGuestCount: this.data.roomSettings?.defaultGuests,
                            guestPrice: this.data.roomSettings?.additionalGuestPrice,
                            nightCount: this.data.nightCount,
                            fullWeekendOnly: this.data.roomSettings?.fullWeekendOnly,
                            fullWeekendDiscount:  this.data.roomSettings?.fullWeekendDiscount,
                            fullWeekendPrice: this.data.roomSettings?.fullWeekendPrice,
                            fullWeekends: this.data.weekends,
                            weekendDatePrice: this.data.roomSettings?.weekendDatePrice, 
                            weekendDates: this.data.weekendDates,
                            nonWeekendDatePrice: this.data.roomSettings?.nonWeekendDatePrice, 
                            nonWeekendDates: this.data.nonWeekendDates,
                            vatAmount: this.data.roomSettings?.VATamount
                        };
                        this.totalSums = this.calculatePrice.calculateTotalPrice(calculationData);
                        // Set variables to set information
                        const domInformation = {
                            roomName: this.data.roomSettings?.roomName,
                            guestFullName: this.data.guestFullName,
                            selectedDates: `${this.data.startDate} - ${this.data.endDate}`,
                            defaultGuestCount: this.data.roomSettings?.defaultGuests,
                            totalGuests: this.data.guestCount,
                            guestPrice: this.totalSums.additionalGuestPrices  + ' €',
                            totalNights: this.data.nightCount,
                            totalNightSum: this.totalSums.totalNightSum + ' €',
                            total: this.totalSums.totalSum + ' €',
                            totalWVAT: this.totalSums.totalSumWithoutVat + ' €'
                        };
                        this.setInformation.applyInformation(domInformation);
                    }
                } else if (clickedAction === 'forward' && nextStepElement) {
                    this.toggleSteps(this.data.activeStep, this.data.activeStep + 1);
                } else if (clickedAction === 'back' && previousStepElement) {
                    this.toggleSteps(this.data.activeStep, this.data.activeStep - 1);
                }
            });
        });
    };

    private toggleSteps(currentStep: number, nextStep: number): void {
        this.data.previousStep = currentStep;
        this.data.activeStep = nextStep;
        this.bookingContainer.querySelector(`[data-step="${currentStep}"]`).classList.remove("active-step");
        this.bookingContainer.querySelector(`[data-step="${nextStep}"]`).classList.add("active-step");

        // If on back step lands on room selection page, remove selected class from room
        const onRoomSelectionStep: boolean = this.bookingContainer.querySelector(".active-step [data-room]") !== null;
        if (onRoomSelectionStep) {
            this.bookingForm = null; // Clear form
            this.data.roomSettings = {}; // Clear settings
            this.roomContainer.forEach((room) => {
                room.classList.remove('selected');
            });
        }

        // If on last step, add or remove last-step class from whole booking container
        const nextStepElement: HTMLElement = document.querySelector(`[data-step="${this.data.activeStep + 1}"]`);
        if (nextStepElement) {
            this.bookingContainer.classList.remove("last-step");
        } else {
            this.bookingContainer.classList.add("last-step");
        }
    }

    private loadRoomSettings(): void {
        // Load initial data from json
        const apiUrl: string = `${this.data.apiUrl}/${this.data.selectedRoom}.json`;
        axios.get(apiUrl)
        .then((response) => {
            // handle success
            this.data.roomSettings = response.data;
            this.data.guestCount = response.data.defaultGuests;
            this.bookingForm = new BookingForm(this.data.roomSettings, this.bookingContainer);
        })
        .catch((error) => {
            // handle error
        })
        .finally(() => {});
    }

}