const express = require('express');
const router = express.Router();
const {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
} = require('../controllers/carController');
const { protect } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Public catalog routes
router.get('/', getAllCars);
router.get('/:id', getCarById);

// Admin-protected car management routes
router.post('/', protect, requireAdmin, createCar);
router.put('/:id', protect, requireAdmin, updateCar);
router.delete('/:id', protect, requireAdmin, deleteCar);

module.exports = router;
