import dayjs, { Dayjs } from "dayjs";

export default class CalculateDays {

    public data: {
        checkInDate: dayjs.Dayjs;
        checkOutDate: dayjs.Dayjs;
        totalNights: number;
        weekends: number;
        weekendDates: { date: string; discount: number }[];
        nonWeekendDays: number;
        nonWeekendDates: { date: string; discount: number }[];
        roomSettings: object;
    };

    constructor(roomSettings: object) {
        this.data = {
            checkInDate: null,
            checkOutDate: null,
            totalNights: 0,
            weekends: 0,
            weekendDates: [],
            nonWeekendDays: 0,
            nonWeekendDates: [],
            roomSettings: roomSettings
        };

        const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
        const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
        const isoWeekday = require('dayjs/plugin/isoWeek');
        dayjs.extend(isSameOrBefore); // add is same or before plugin
        dayjs.extend(isSameOrAfter); // add is same or after plugin
        dayjs.extend(isoWeekday); // add iso weekday plugin
    }

    public adjustDates(checkInDate: dayjs.Dayjs, checkOutDate: dayjs.Dayjs): void {
        const today: dayjs.Dayjs = dayjs();
        this.data.checkInDate = checkInDate;
		this.data.checkOutDate = checkOutDate;

        // if startDate day is disabled, set startDate to + 1 day && set endDate to + 1 day from startDate
        if (this.data.roomSettings?.disabledStartDays.includes(this.data.checkInDate.day())) {
            this.data.checkInDate = checkInDate.add(1, 'day');
            this.data.checkOutDate = this.data.checkInDate.add(1, 'day');
        }

        // if checkInDate and checkOutDate are the same, set checkOutDate to + 1 day
		if (checkInDate.isSame(checkOutDate)) {
			this.data.checkOutDate = checkInDate.add(1, 'day').startOf('day');
		}

        // If only full weekends are available to book
        if (this.data.roomSettings?.fullWeekendOnly) {
            // If check-in date is Sunday, move it to the next Monday and set check-out date to Tuesday
            if (this.data.checkInDate.day() === 0) {
                this.data.checkInDate = this.data.checkInDate.add(1, 'day').startOf('day');
                this.data.checkOutDate = this.data.checkInDate.add(2, 'day').startOf('day');
            }

            // If check-in date is Saturday and today is not the previous day (Friday), move it to the next Monday and check-out date to Tuesday
            if (this.data.checkInDate.day() === 6 && !today.isSame(this.data.checkInDate.subtract(1, 'day'), 'day')) {
                this.data.checkInDate = this.data.checkInDate.add(2, 'day').startOf('day');
                this.data.checkOutDate = this.data.checkInDate.add(1, 'day').startOf('day');
            }

            // If check-out date is Saturday, move it to Sunday and display a warning
            if (this.data.checkOutDate.day() === 6) {
                console.warn('Warning: Only full weekends can be selected. Check-out date adjusted to Sunday.');
                this.data.checkOutDate = this.data.checkOutDate.add(1, 'day').startOf('day');
            }
        }

        this.countDays();
    }

    private countDays(): void {
        this.data.totalNights = this.data.checkOutDate.diff(this.data.checkInDate, 'day');
        let currentDay: dayjs.Dayjs = this.data.checkInDate.startOf('day');
		const checkOutDay: dayjs.Dayjs = this.data.checkOutDate.startOf('day');
		this.data.weekends = 0;
        this.data.nonWeekendDays = 0;
        // Loop while current day is before checkoutDay
        while (currentDay.isSameOrBefore(checkOutDay)) {
            // If is weekendDay and checkoutDay is not weekendDay - add weekendDay
            const checkoutDayIsFirstWeekendDay = currentDay.isSame(checkOutDay) && checkOutDay.day() === (this.data.roomSettings?.weekendDays[0] ?? -1);
            if (this.isWeekendDay(currentDay) && !checkoutDayIsFirstWeekendDay) {
                const discountAmount = this.getDiscountForDay(currentDay);
				const weekendDate = {date: currentDay.format('YYYY-MM-DD'), discount: discountAmount};
				this.data.weekendDates.push(weekendDate);
                this.data.weekends++;
            } else { // Else - non weekend days
                const discountAmount = this.getDiscountForDay(currentDay);
				const nonWeekendDate = {date: currentDay.format('YYYY-MM-DD'), discount: discountAmount};
				this.data.nonWeekendDates.push(nonWeekendDate);
                this.data.nonWeekendDays++;
            }
            currentDay = currentDay.add(1, 'day');
        }
        // Divide initial weekend count (days) by weekendDays from roomSettings - get correct weekend count
        this.data.weekends /= (this.data.roomSettings?.weekendDays.length || 1);
    }

    private getDiscountForDay(currentDay: dayjs.Dayjs): number | null {
		const currentDateStr = currentDay.format('YYYY-MM-DD');
        // If currentDay is checkoutDate, don't apply discount
		if (currentDay.isSame(this.data.checkOutDate)) {
			return 0;
		}
        // If any discounts match - apply
		const matchedDiscount = this.data.roomSettings?.discountDates.find((discount) => discount.date === currentDateStr);
		return matchedDiscount ? matchedDiscount.discount : 0;
	}

    private isWeekendDay(date: dayjs.Dayjs): boolean {
        // Check if current day is set as weekendDay in roomSettings - return true if so
		return this.data.roomSettings?.weekendDays.includes(date.day()) ?? false;
	}
}