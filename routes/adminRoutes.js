const express = require('express');
const router = express.Router();
const {
  getAdminDashboardStats,
  getAllBookings,
  updateBookingStatus,
  recordPayment,
  getPayments,
  getAllCustomers,
  updateCustomerStatus,
} = require('../controllers/adminController');
const {
  getAllContactMessages,
  updateContactMessageStatus,
} = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// All admin routes require login and admin role
router.use(protect, requireAdmin);

// Dashboard metrics
router.get('/dashboard', getAdminDashboardStats);

// Bookings management
router.get('/bookings', getAllBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

// Payments management & offline recording
router.get('/payments', getPayments);
router.post('/payments', recordPayment);

// Customer directory
router.get('/customers', getAllCustomers);
router.patch('/customers/:id/status', updateCustomerStatus);

// Contact messages
router.get('/contacts', getAllContactMessages);
router.patch('/contacts/:id/status', updateContactMessageStatus);

module.exports = router;
