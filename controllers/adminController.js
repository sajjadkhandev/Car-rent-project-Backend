const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// @desc    Get dashboard metrics, fleet stats, and revenue summary based on actual recorded payments
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getAdminDashboardStats = async (req, res, next) => {
  try {
    const totalCars = await Car.countDocuments();
    const availableCars = await Car.countDocuments({ active: true });
    
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ bookingStatus: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'confirmed' });
    const activeRentals = await Booking.countDocuments({ bookingStatus: 'active' });
    const completedBookings = await Booking.countDocuments({ bookingStatus: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ bookingStatus: 'cancelled' });

    const registeredCustomers = await User.countDocuments({ role: 'customer' });

    // Revenue calculation based strictly on actual verified/recorded Payment documents
    const paymentAggregate = await Payment.aggregate([
      { $match: { status: { $in: ['recorded', 'verified'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          paymentsCount: { $sum: 1 },
        },
      },
    ]);

    const totalVerifiedRevenue = paymentAggregate.length > 0 ? paymentAggregate[0].totalRevenue : 0;
    const totalPaymentsCount = paymentAggregate.length > 0 ? paymentAggregate[0].paymentsCount : 0;

    // Projected revenue from confirmed/active/completed bookings
    const projectedBookingsAggregate = await Booking.aggregate([
      { $match: { bookingStatus: { $in: ['confirmed', 'active', 'completed'] } } },
      {
        $group: {
          _id: null,
          projectedTotal: { $sum: '$totalPrice' },
        },
      },
    ]);
    const projectedRevenue = projectedBookingsAggregate.length > 0 ? projectedBookingsAggregate[0].projectedTotal : 0;

    // Recent 5 bookings
    const recentBookings = await Booking.find()
      .populate('car', 'brand model images dailyPrice')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    // Fleet category breakdown
    const fleetBreakdown = await Car.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$dailyPrice' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalCars,
        availableCars,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        activeRentals,
        completedBookings,
        cancelledBookings,
        registeredCustomers,
        totalVerifiedRevenue,
        totalPaymentsCount,
        projectedRevenue,
      },
      recentBookings,
      fleetBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings with filters, search, and pagination
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res, next) => {
  try {
    const { status, paymentStatus, search, page = 1, limit = 15 } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.bookingStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      // Find matching users first to filter bookings
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { bookingNumber: { $regex: search, $options: 'i' } },
        { customer: { $in: userIds } },
        { pickupLocation: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('car', 'brand model year category dailyPrice registrationNumber images')
      .populate('customer', 'name email phone city cnic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (Confirm, Mark Active, Mark Completed, Reject)
// @route   PATCH /api/admin/bookings/:id/status
// @access  Private/Admin
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('car')
      .populate('customer', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    booking.bookingStatus = status;
    if (adminNotes) {
      booking.adminNotes = adminNotes;
    }

    if (status === 'completed') {
      // Increment trip count on car
      await Car.findByIdAndUpdate(booking.car._id, { $inc: { tripsCount: 1 } });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: `Booking status updated to "${status}".`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a verified offline payment for a booking
// @route   POST /api/admin/payments
// @access  Private/Admin
const recordPayment = async (req, res, next) => {
  try {
    const {
      bookingId,
      amount,
      method,
      transactionReference,
      notes,
    } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bookingId and payment amount.',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const payment = await Payment.create({
      booking: booking._id,
      customer: booking.customer,
      amount: Number(amount),
      method: method || 'Cash on Pickup',
      status: 'verified',
      transactionReference: transactionReference || '',
      notes: notes || '',
      receivedBy: req.user.id,
      paidAt: new Date(),
    });

    // Recalculate total paid so far for this booking
    const allPayments = await Payment.find({
      booking: booking._id,
      status: 'verified',
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= booking.totalPrice) {
      booking.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      booking.paymentStatus = 'partially_paid';
    }

    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Verified payment successfully recorded.',
      payment,
      updatedBookingPaymentStatus: booking.paymentStatus,
      totalPaid,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payments list (Admin audit)
// @route   GET /api/admin/payments
// @access  Private/Admin
const getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('booking', 'bookingNumber totalPrice pickupDate returnDate')
      .populate('customer', 'name email phone')
      .populate('receivedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all customers with search and booking statistics
// @route   GET /api/admin/customers
// @access  Private/Admin
const getAllCustomers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query = { role: 'customer' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const customers = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Fetch booking counts for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (cust) => {
        const bookingsCount = await Booking.countDocuments({ customer: cust._id });
        const lastBooking = await Booking.findOne({ customer: cust._id }).sort({ createdAt: -1 });
        return {
          ...cust.toJSON(),
          bookingsCount,
          lastBookingDate: lastBooking ? lastBooking.createdAt : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: customersWithStats.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      customers: customersWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend or activate a customer account
// @route   PATCH /api/admin/customers/:id/status
// @access  Private/Admin
const updateCustomerStatus = async (req, res, next) => {
  try {
    const { accountStatus } = req.body;

    if (!accountStatus || !['active', 'suspended'].includes(accountStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "active" or "suspended".',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be suspended.',
      });
    }

    user.accountStatus = accountStatus;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Customer account has been ${accountStatus === 'active' ? 'activated' : 'suspended'}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardStats,
  getAllBookings,
  updateBookingStatus,
  recordPayment,
  getPayments,
  getAllCustomers,
  updateCustomerStatus,
};
