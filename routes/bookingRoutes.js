const express = require('express');
const router = express.Router();
const {
  getBookingQuote,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// Public availability & quote calculation
router.post('/quote', getBookingQuote);

// Customer protected booking routes
router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.patch('/:id/cancel', protect, cancelBooking);

module.exports = router;
