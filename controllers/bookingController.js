const Booking = require('../models/Booking');
const Car = require('../models/Car');
const { calculateRentalDetails } = require('../utils/priceCalculator');

/**
 * Check if the vehicle is already booked for overlapping date ranges.
 * A conflict occurs if an existing booking's [pickupDate, returnDate] overlaps with the requested range,
 * and the existing booking is in 'confirmed' or 'active' status (or optionally 'pending').
 */
const checkOverlapConflict = async (carId, pickupDate, returnDate, excludeBookingId = null) => {
  const query = {
    car: carId,
    bookingStatus: { $in: ['confirmed', 'active', 'pending'] },
    $or: [
      // Case 1: Existing booking starts during the requested period
      { pickupDate: { $gte: pickupDate, $lt: returnDate } },
      // Case 2: Existing booking ends during the requested period
      { returnDate: { $gt: pickupDate, $lte: returnDate } },
      // Case 3: Existing booking encloses the requested period
      { pickupDate: { $lte: pickupDate }, returnDate: { $gte: returnDate } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(query);
  return conflictingBooking;
};

// @desc    Calculate quote and preview pricing breakdown (does not save)
// @route   POST /api/bookings/quote
// @access  Public
const getBookingQuote = async (req, res, next) => {
  try {
    const { carId, pickupDate, returnDate } = req.body;

    if (!carId || !pickupDate || !returnDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide carId, pickupDate, and returnDate.',
      });
    }

    const car = await Car.findById(carId);
    if (!car || !car.active) {
      return res.status(404).json({
        success: false,
        message: 'Selected vehicle is currently unavailable in the fleet.',
      });
    }

    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);

    // Overlap verification
    const conflict = await checkOverlapConflict(car._id, pickup, returnD);

    const pricing = calculateRentalDetails(
      pickupDate,
      returnDate,
      car.dailyPrice,
      car.securityDeposit
    );

    res.status(200).json({
      success: true,
      isAvailable: !conflict,
      conflictMessage: conflict
        ? `This vehicle is already booked from ${new Date(conflict.pickupDate).toLocaleDateString()} to ${new Date(conflict.returnDate).toLocaleDateString()}. Please select alternate dates.`
        : null,
      pricing,
      car: {
        id: car._id,
        brand: car.brand,
        model: car.model,
        year: car.year,
        image: car.images[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new booking reservation
// @route   POST /api/bookings
// @access  Private (Customer)
const createBooking = async (req, res, next) => {
  try {
    const {
      carId,
      pickupDate,
      returnDate,
      pickupTime = '10:00 AM',
      returnTime = '10:00 AM',
      pickupLocation,
      returnLocation,
      driverName,
      driverPhone,
      driverCnic,
      driverLicenseNumber,
      notes,
    } = req.body;

    if (!carId || !pickupDate || !returnDate || !pickupLocation || !returnLocation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide carId, pickupDate, returnDate, pickupLocation, and returnLocation.',
      });
    }

    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);

    if (pickup < new Date(new Date().setHours(0, 0, 0, 0))) {
      return res.status(400).json({
        success: false,
        message: 'Pickup date cannot be in the past.',
      });
    }

    const car = await Car.findById(carId);
    if (!car || !car.active) {
      return res.status(404).json({
        success: false,
        message: 'Selected vehicle is not available in our fleet.',
      });
    }

    // Backend Overlap Validation: Prevents overlapping bookings
    const conflict = await checkOverlapConflict(car._id, pickup, returnD);
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Conflict detected: This vehicle is already booked from ${new Date(conflict.pickupDate).toLocaleDateString()} to ${new Date(conflict.returnDate).toLocaleDateString()}. Please pick different dates.`,
      });
    }

    // Backend-verified price calculation (Ignore any client-supplied totals)
    const pricing = calculateRentalDetails(
      pickupDate,
      returnDate,
      car.dailyPrice,
      car.securityDeposit
    );

    const booking = await Booking.create({
      customer: req.user.id,
      car: car._id,
      pickupDate: pickup,
      returnDate: returnD,
      pickupTime,
      returnTime,
      pickupLocation,
      returnLocation,
      rentalDays: pricing.rentalDays,
      dailyPrice: pricing.dailyPrice,
      securityDeposit: pricing.securityDeposit,
      taxesAndFees: pricing.taxesAndFees,
      totalPrice: pricing.totalRentalAmount,
      bookingStatus: 'pending',
      paymentStatus: 'unpaid',
      driverName: driverName || req.user.name,
      driverPhone: driverPhone || req.user.phone,
      driverCnic: driverCnic || req.user.cnic || '',
      driverLicenseNumber: driverLicenseNumber || '',
      notes: notes || '',
    });

    // Populate car & customer for immediate confirmation UI response
    await booking.populate('car', 'brand model year category images dailyPrice transmission');
    await booking.populate('customer', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully! Our fleet team will review and confirm shortly.',
      booking,
      pricingBreakdown: pricing.breakdown,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings of the currently logged-in customer
// @route   GET /api/bookings/my
// @access  Private (Customer)
const getMyBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { customer: req.user.id };

    if (status && status !== 'all') {
      query.bookingStatus = status;
    }

    const bookings = await Booking.find(query)
      .populate('car', 'brand model year category images dailyPrice transmission registrationNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking details
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('car')
      .populate('customer', 'name email phone city cnic');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Role check: Only customer owner or admin can view
    if (
      req.user.role !== 'admin' &&
      booking.customer._id.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only access your own reservations.',
      });
    }

    res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an eligible booking (Customer or Admin)
// @route   PATCH /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Customer can only cancel their own booking
    if (
      req.user.role !== 'admin' &&
      booking.customer.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only cancel your own bookings.',
      });
    }

    // Cannot cancel already completed or active bookings
    if (booking.bookingStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed bookings cannot be cancelled.',
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been cancelled.',
      });
    }

    booking.bookingStatus = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by customer';
    booking.cancelledAt = new Date();

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking has been cancelled successfully.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBookingQuote,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  checkOverlapConflict,
};
