export default class CalculatePrice {

    private data: object;

    private calculateWeekendDateSum(): number {
        let totalSum = 0;
        // If full weekend only - multiple full weekends by weekend price and apply full weekend discount
        if (this.data.fullWeekendOnly) {
            totalSum = (this.data.fullWeekends * this.data.fullWeekendPrice) * (1 - this.data.fullWeekendDiscount / 100);
        } else { // loop each date & apply discount for each
            this.data.weekendDates.map((weekendDate) => {
                const dateDiscountedPrice = weekendDate.discount > 0 ? 
                    this.data.weekendDatePrice - (weekendDate.discount / 100 * this.data.weekendDatePrice) : this.data.weekendDatePrice;
                totalSum += dateDiscountedPrice;
            });
        }
        return totalSum;
    }

    private calculateNonWeekendDatesSum(): number {
        let totalSum = 0;
        // loop each date & apply discount for each
        this.data.nonWeekendDates.map((nonWeekendDate) => {
            const dateDiscountedPrice = nonWeekendDate.discount > 0 ? 
                this.data.nonWeekendDatePrice - (nonWeekendDate.discount / 100 * this.data.nonWeekendDatePrice) : this.data.nonWeekendDatePrice;
            totalSum += dateDiscountedPrice;
        });
        return totalSum;
    }

    private calculateAdditionalGuestSum(): number {
        let totalSum = 0;
        // If more guests than default (free) guest count
        if (this.data.guestCount > this.data.defaultGuestCount) {
            const additionalGuests = this.data.guestCount - this.data.defaultGuestCount;
            totalSum += (additionalGuests * this.data.nightCount) * this.data.guestPrice;
        }
        return totalSum;
    }

    public calculateTotalPrice(data: object): object {
        let prices = {
            weekendPrices: 0,
            nonWeekendPrices: 0,
            additionalGuestPrices: 0,
            totalNightSum: 0,
            totalSum: 0,
            totalSumWithoutVat: 0,
        };
        this.data = data;
        // Calculate prices
        prices.weekendPrices = this.calculateWeekendDateSum();
        prices.nonWeekendPrices = this.calculateNonWeekendDatesSum();
        prices.additionalGuestPrices = this.calculateAdditionalGuestSum();
        prices.totalNightSum = prices.weekendPrices + prices.nonWeekendPrices;
        prices.totalSum = prices.weekendPrices + prices.nonWeekendPrices + prices.additionalGuestPrices;
        prices.totalSumWithoutVat = prices.totalSum - (this.data.vatAmount / 100 * prices.totalSum)
        return prices;
    }
}