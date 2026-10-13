const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Associated booking ID is required'],
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount in PKR is required'],
      min: [1, 'Amount must be greater than zero'],
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: [
        'Cash on Pickup',
        'Bank Transfer',
        'Credit/Debit Card (Direct)',
        'JazzCash',
        'EasyPaisa',
      ],
      default: 'Cash on Pickup',
    },
    status: {
      type: String,
      enum: ['recorded', 'verified', 'rejected'],
      default: 'verified',
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin user who confirmed/recorded the payment
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.pre('save', function (next) {
  if (!this.receiptNumber) {
    this.receiptNumber = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
