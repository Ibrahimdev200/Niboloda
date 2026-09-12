/**
 * NIBOLODA Driver Pricing Engine
 * Calculates estimated fare based on individual driver's custom pricing configuration.
 * NIBOLODA DOES NOT TAKE A COMMISSION (0% Commission).
 * Earnings go 100% to the driver.
 */

function calculateDriverFare(driverPricing, distanceKm, durationMin) {
  if (!driverPricing) {
    // Fallback default pricing if driver hasn't configured custom rules
    const defaultMin = 2000;
    const defaultPreferred = 2500;
    const defaultPerKm = 250;
    const defaultPerMin = 50;
    const calculated = defaultPreferred + (distanceKm * defaultPerKm) + (durationMin * defaultPerMin);
    return Math.max(defaultMin, Math.round(calculated / 100) * 100);
  }

  const { minFare, preferredFare, pricePerKm, pricePerMin, minDistance, maxDistance } = driverPricing;

  // Check service distance limits
  if (distanceKm < (minDistance || 0)) {
    // Below driver min distance
  }
  if (maxDistance && distanceKm > maxDistance) {
    // Exceeds driver max distance limit
  }

  // Calculated distance + time fare
  const variableFare = (distanceKm * pricePerKm) + (durationMin * pricePerMin);
  const totalRawFare = (preferredFare || 0) + variableFare;

  // Ensure fare is at least minimum trip fare
  const finalFare = Math.max(minFare || 0, totalRawFare);

  // Round to nearest 100 Naira for clean Nigerian currency presentation
  return Math.round(finalFare / 100) * 100;
}

module.exports = {
  calculateDriverFare
};
