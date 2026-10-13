/**
 * Server-side rental pricing calculator and duration validator.
 * Validates dates and calculates total PKR amounts without trusting frontend inputs.
 */

const calculateRentalDetails = (pickupDateStr, returnDateStr, dailyPrice, customSecurityDeposit = 0) => {
  const pickup = new Date(pickupDateStr);
  const returnDate = new Date(returnDateStr);

  if (isNaN(pickup.getTime()) || isNaN(returnDate.getTime())) {
    throw new Error('Invalid pickup or return date format');
  }

  // Ensure dates are compared cleanly
  const diffTime = returnDate.getTime() - pickup.getTime();
  
  if (diffTime <= 0) {
    throw new Error('Return date must be after pickup date');
  }

  // Calculate rental days (minimum 1 day, rounded up if partial)
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const baseRentalCost = diffDays * dailyPrice;
  
  // Tax / Service fee (5% standard regulatory service charge)
  const taxesAndFees = Math.round(baseRentalCost * 0.05);

  // Security deposit is refundable upon car return without damages
  const securityDeposit = customSecurityDeposit || 15000;

  // Total amount payable for rental (base rental + taxes, deposit held separately or on pickup)
  const totalRentalAmount = baseRentalCost + taxesAndFees;

  return {
    rentalDays: diffDays,
    dailyPrice,
    baseRentalCost,
    taxesAndFees,
    securityDeposit,
    totalRentalAmount, // Total price for booking record
    breakdown: {
      dailyRateFormatted: `PKR ${dailyPrice.toLocaleString()}`,
      rentalDays: diffDays,
      baseRentalCostFormatted: `PKR ${baseRentalCost.toLocaleString()}`,
      taxesAndFeesFormatted: `PKR ${taxesAndFees.toLocaleString()}`,
      securityDepositFormatted: `PKR ${securityDeposit.toLocaleString()} (Refundable)`,
      totalPayableFormatted: `PKR ${totalRentalAmount.toLocaleString()}`,
      includedBenefits: [
        'Free cancellation up to 24h before pickup',
        'Basic vehicle protection & comprehensive collision insurance included',
        '24/7 Nationwide roadside assistance in Pakistan',
        'Fuel policy: Level to level (Return with same fuel as pickup)',
      ],
      notIncluded: [
        'Security deposit is collected on pickup and fully refunded upon return inspection',
        'Toll taxes (M-Tag/Cash) and traffic violations are paid by renter',
        'Excess mileage beyond 250 km/day charged at PKR 35/km',
      ],
    },
  };
};

module.exports = { calculateRentalDetails };
