const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: [true, 'Car ID is required'],
      index: true,
    },
    pickupDate: {
      type: Date,
      required: [true, 'Pickup date is required'],
      index: true,
    },
    returnDate: {
      type: Date,
      required: [true, 'Return date is required'],
      index: true,
    },
    pickupTime: {
      type: String,
      default: '10:00 AM',
    },
    returnTime: {
      type: String,
      default: '10:00 AM',
    },
    pickupLocation: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    returnLocation: {
      type: String,
      required: [true, 'Return location is required'],
      trim: true,
    },
    rentalDays: {
      type: Number,
      required: true,
      min: [1, 'Rental duration must be at least 1 day'],
    },
    dailyPrice: {
      type: Number,
      required: true,
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    taxesAndFees: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    driverCnic: {
      type: String,
      trim: true,
    },
    driverLicenseNumber: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to generate unique readable booking number
bookingSchema.pre('save', async function (next) {
  if (!this.bookingNumber) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.bookingNumber = `DE-${new Date().getFullYear()}-${randomSuffix}`;
  }
  next();
});

// Index to efficiently check overlapping bookings
bookingSchema.index({ car: 1, bookingStatus: 1, pickupDate: 1, returnDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
