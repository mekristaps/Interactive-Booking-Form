import DateRangePicker from "vanillajs-datepicker/DateRangePicker";
import dayjs, { Dayjs } from "dayjs";
import axios, {AxiosError, AxiosResponse} from "axios";
import CalculateDays from "./CalculateDays";

export default class BookingForm {

    private bookingContainer: HTMLElement;
    private bookingForm: HTMLFormElement;

    public formData: {
        formValid: boolean;
        errorApiUrl: string;
        guestFullName: string;
        guestCount: number;
        nightCount: number;
        selectedDateRange: Array<Date>;
        startDate: Date | dayjs.Dayjs | string;
        endDate: Date | dayjs.Dayjs | string;
        weekends: number;
        nonWeekendDays: number;
        weekendDates: { date: string; discount: number }[];
        nonWeekendDates: { date: string; discount: number }[];
        roomSettings: object;
    };

    private requiredFormInputs: Array<HTMLInputElement> = [];
    private firstNameInput: HTMLInputElement;
    private lastNameInput: HTMLInputElement;

    private guestCountContainer: HTMLElement;
    private guestCountIncreaseButton: HTMLButtonElement;
    private guestCountInput: HTMLInputElement;
    private guestCountDecreaseButton: HTMLButtonElement;

    private dateRangePicker: DateRangePicker;
    private dateContainer: HTMLElement;

    private calculateDays: CalculateDays;

    constructor(roomSettings: object, bookingContainer: HTMLElement) {

        this.bookingContainer = bookingContainer;
        this.bookingForm = this.bookingContainer.querySelector('.booking-form');
        
        this.formData = {
            formValid: false,
            errorApiUrl: this.bookingForm.getAttribute('data-errors'),
            guestFullName: '',
            guestCount: 1,
            nightCount: 0,
            selectedDateRange:[],
            startDate: '',
            endDate: '',
            weekends: 0,
            nonWeekendDays: 0,
            weekendDates: [],
            nonWeekendDates: [],
            roomSettings: roomSettings
        };
        this.formData.guestCount = this.formData.roomSettings?.defaultGuests;
        
        this.requiredFormInputs = Array.from(this.bookingForm.querySelectorAll("input[required]"));

        this.firstNameInput = this.bookingForm.querySelector('input[name="first-name"]');
        this.lastNameInput = this.bookingForm.querySelector('input[name="last-name"]');

        this.guestCountContainer = this.bookingForm.querySelector('[data-booking-guests]');
        this.guestCountIncreaseButton = this.guestCountContainer.querySelector('[data-booking-guests-increase]');
        this.guestCountInput = this.guestCountContainer.querySelector('input');
        this.guestCountDecreaseButton = this.guestCountContainer.querySelector('[data-booking-guests-decrease]');

        this.dateContainer = this.bookingForm.querySelector('[data-booking-dates]');

        this.calculateDays = new CalculateDays(this.formData.roomSettings);

        this.init();
        this.addEventListeners();
    }

    private init(): void {
        // Set guest input value to default room guest count value
        this.guestCountInput.setAttribute('value', this.formData.roomSettings?.defaultGuests.toString());

        // Initilize range picker
        const rangePickerMinDate = dayjs(new Date().toJSON().slice(0, 10)).format("MM/DD/YYYY");
        this.dateRangePicker = new DateRangePicker(this.dateContainer, {
            minDate: rangePickerMinDate,
            todayHighlight: true,
            weekStart: 1,
            daysOfWeekHighlighted: this.formData.roomSettings?.weekendDays,
            datesDisabled: this.formData.roomSettings?.disabledDates
        });
    }

    private addEventListeners(): void { 
        this.firstNameInput.addEventListener('keyup', (event) => {
            const firstName: string = event.target.value.trim();
            const lastName: string = this.lastNameInput.value.trim();
            this.formData.guestFullName = lastName ? `${firstName} ${lastName}` : firstName;
        });

        this.lastNameInput.addEventListener('keyup', (event) => {
            const lastName: string = event.target.value.trim();
            const firstName: string = this.firstNameInput.value.trim();
            this.formData.guestFullName = firstName ? `${firstName} ${lastName}` : lastName;
        });

        this.guestCountIncreaseButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.adjustGuestCount('increase');
        });

        this.guestCountDecreaseButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.adjustGuestCount('decrease');
        });

        this.dateContainer.querySelectorAll('input').forEach((dateInputElement) => {

            // Trigger when range picker is opened
            dateInputElement.addEventListener('show', (event) => {
                const discountTimestamps: string[] = this.formData.roomSettings?.discountDates.map(item => new Date(item.date).toISOString().slice(0, 10));
                const currentDateInputParent: HTMLElement = event.target.parentNode;
                const dateSpanElements: NodeListOf<HTMLElement> = currentDateInputParent.querySelectorAll('.datepicker-grid span[data-date]');
                // Set discount date classes
                dateSpanElements.forEach(span => {
                    const timestamp: number = parseInt(span.getAttribute('data-date'), 10);
                    const date: Date = new Date(timestamp);
                    const formattedDate: string = date.toISOString().slice(0, 10);
                    if (discountTimestamps.includes(formattedDate)) {
                        span.classList.add('discount');
                    }
                }); 
            });

            // Trigger when range picker is closed
            dateInputElement.addEventListener('hide', (event) => {
                this.formData.selectedDateRange = this.dateRangePicker.getDates();
                this.formData.startDate = this.formData.selectedDateRange?.[0] ?? '';
                this.formData.endDate = this.formData.selectedDateRange?.[1] ?? '';

                this.calculateDays.adjustDates(dayjs(this.formData.startDate), dayjs(this.formData.endDate));
                this.isDisabledDateRange(event.currentTarget as HTMLElement);
                // Set data from day calculation
                this.formData.startDate = this.calculateDays.data?.checkInDate;
                this.formData.endDate = this.calculateDays.data?.checkOutDate;
                this.dateRangePicker.setDates(this.formData.startDate.toDate(), this.formData.endDate.toDate());
                this.formData.nightCount = this.calculateDays.data?.totalNights
                this.formData.weekends = this.calculateDays.data?.weekends
                this.formData.nonWeekendDays = this.calculateDays.data?.nonWeekendDays
                this.formData.weekendDates = this.calculateDays.data?.weekendDates
                this.formData.nonWeekendDates = this.calculateDays.data?.nonWeekendDates
            });
        });
    }

    private isDisabledDateRange(input: HTMLElement): void {
        const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
        dayjs.extend(isSameOrBefore); // add is same or before plugin

        let currentDate: Dayjs = dayjs(this.formData.startDate).clone();
        let disabledDateInRange: boolean = false;

        // Check if date range includes any disabled dates
        while (currentDate.isSameOrBefore(dayjs(this.formData.endDate))) {
            const formattedDate: string = currentDate.format("MM/DD/YYYY");
            if (this.formData.roomSettings?.disabledDates.includes(formattedDate)) {
                disabledDateInRange = true;
                break;
            }
            currentDate = currentDate.add(1, "day");
        }

        // Get current input parent element of .form-field
        let formField: HTMLElement = input.parentElement;
        while (!formField.classList.contains('form-field')) {
            formField = formField.parentElement;
        }

        // If includes disabled date - add .disabled-date class and set formValid as false for validation
        if (disabledDateInRange) {
            formField.classList.add('disabled-date');
            this.formData.formValid = false;
        } else { // Remove .disabled-date from any date .form field elements 
            const disabledDateElements: NodeListOf<HTMLElement> = this.dateContainer.querySelectorAll('.disabled-date');
            disabledDateElements.forEach(element => element.classList.remove('disabled-date'));
        }
    }

    private adjustGuestCount(action: string): void {
        if (action === 'decrease') {
            this.formData.guestCount --;
        } else if (action === 'increase') {
            this.formData.guestCount ++;
        }
        
        this.guestCountInput.setAttribute('value', this.formData.guestCount.toString());

        if (this.formData.guestCount === this.formData.roomSettings?.maxGuests) {;
            this.guestCountIncreaseButton.setAttribute('disabled', null);
        } else if (this.formData.guestCount === 1) {
            this.guestCountDecreaseButton.setAttribute('disabled', null);
        } else {
            this.guestCountIncreaseButton.removeAttribute('disabled');
            this.guestCountDecreaseButton.removeAttribute('disabled');
        }
    }

    public validateForm(): boolean {
        const errorFormFields: number = this.bookingForm.querySelectorAll(".form-field.has-error").length;

        if (errorFormFields === 0) {
            this.formData.formValid = true;
        }

        this.requiredFormInputs.map((input) => {

            // Get current input parent element of .form-field
            let formField: HTMLElement = input.parentElement;
            while (!formField.classList.contains('form-field')) {
                formField = formField.parentElement;
            }

            // If input is empty and has .form-field class or has .disabled-date class - add .has-error and set formValid to false
            if (input.value == '' && formField.classList.contains('form-field') || formField.classList.contains('disabled-date')) {
                formField.classList.add('has-error');
                this.formData.formValid = false;
            } else if (input.value!= '' && !formField.classList.contains('form-field.has-error')) {
                const errorMessage: HTMLElement = formField.querySelector('.error-message');
                formField.classList.remove('has-error');
                errorMessage.classList.remove('active');
            }
        });

        // If form is not valid, get error messages
        if (!this.formData.formValid) {
            this.addErrorMessages();
        }

        return this.formData.formValid;
    }

    private async addErrorMessages(): Promise<void> {
        const errorElements: Array<HTMLElement> = Array.from(this.bookingForm.querySelectorAll(".form-field.has-error"));
        let errorMessages: object = {};
        try {
            errorMessages = await axios.get(this.formData.errorApiUrl);
        } catch (error) {}
        
        errorElements.map((formField) => {
            let inputName: string = formField.querySelector('input').getAttribute('name');
            const errorMessage: HTMLElement = formField.querySelector('.error-message');

            if (formField.classList.contains('disabled-date')) {
                inputName = 'disabled-date';
            }

            errorMessage.classList.add('active');
            errorMessage.innerHTML = errorMessages.data[inputName];
        });
    }
}