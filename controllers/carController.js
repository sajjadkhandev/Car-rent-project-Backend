const Car = require('../models/Car');
const Booking = require('../models/Booking');

// @desc    Get all cars with comprehensive filtering, search, sorting, and pagination
// @route   GET /api/cars
// @access  Public
const getAllCars = async (req, res, next) => {
  try {
    const {
      brand,
      category,
      transmission,
      fuelType,
      seats,
      minPrice,
      maxPrice,
      city,
      search,
      sort,
      page = 1,
      limit = 12,
      includeInactive = false,
    } = req.query;

    const query = {};

    // Only active cars for public catalog unless admin requests inactive
    if (!includeInactive) {
      query.active = true;
    }

    if (brand) {
      query.brand = new RegExp(`^${brand}$`, 'i');
    }

    if (category) {
      query.category = category;
    }

    if (transmission) {
      query.transmission = transmission;
    }

    if (fuelType) {
      query.fuelType = fuelType;
    }

    if (seats) {
      query.seats = { $gte: Number(seats) };
    }

    if (minPrice || maxPrice) {
      query.dailyPrice = {};
      if (minPrice) query.dailyPrice.$gte = Number(minPrice);
      if (maxPrice) query.dailyPrice.$lte = Number(maxPrice);
    }

    if (city) {
      query.cityLocations = { $regex: new RegExp(city, 'i') };
    }

    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') sortOptions = { dailyPrice: 1 };
    else if (sort === 'price-desc') sortOptions = { dailyPrice: -1 };
    else if (sort === 'year-desc') sortOptions = { year: -1 };
    else if (sort === 'rating-desc') sortOptions = { rating: -1 };

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Car.countDocuments(query);
    const cars = await Car.find(query).sort(sortOptions).skip(skip).limit(limitNum);

    // Get unique brands, categories, fuel types for frontend filter menus
    const filterOptions = await Car.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: null,
          brands: { $addToSet: '$brand' },
          categories: { $addToSet: '$category' },
          transmissions: { $addToSet: '$transmission' },
          fuelTypes: { $addToSet: '$fuelType' },
          minDailyPrice: { $min: '$dailyPrice' },
          maxDailyPrice: { $max: '$dailyPrice' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: cars.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      filtersMeta: filterOptions[0] || {},
      cars,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single car by ID with specifications and availability calendar
// @route   GET /api/cars/:id
// @access  Public
const getCarById = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found with the requested ID.',
      });
    }

    // Fetch upcoming booked date intervals to assist frontend calendar disabling
    const activeBookings = await Booking.find({
      car: car._id,
      bookingStatus: { $in: ['confirmed', 'active', 'pending'] },
      returnDate: { $gte: new Date() },
    }).select('pickupDate returnDate bookingStatus');

    res.status(200).json({
      success: true,
      car,
      reservedDates: activeBookings.map((b) => ({
        from: b.pickupDate,
        to: b.returnDate,
        status: b.bookingStatus,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new car entry (Admin only)
// @route   POST /api/cars
// @access  Private/Admin
const createCar = async (req, res, next) => {
  try {
    const {
      brand,
      model,
      year,
      category,
      images,
      description,
      dailyPrice,
      securityDeposit,
      transmission,
      fuelType,
      seats,
      features,
      cityLocations,
      registrationNumber,
      mileageLimitKmPerDay,
    } = req.body;

    if (!brand || !model || !year || !category || !dailyPrice || !transmission || !fuelType || !seats) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory car specifications and pricing.',
      });
    }

    const newCar = await Car.create({
      brand,
      model,
      year: Number(year),
      category,
      images: Array.isArray(images) && images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
      ],
      description: description || `${year} ${brand} ${model} available for rent across Pakistan.`,
      dailyPrice: Number(dailyPrice),
      securityDeposit: securityDeposit ? Number(securityDeposit) : 15000,
      transmission,
      fuelType,
      seats: Number(seats),
      features: Array.isArray(features) ? features : ['Air Conditioning', 'Bluetooth', 'ABS Brakes'],
      cityLocations: Array.isArray(cityLocations) ? cityLocations : ['Lahore', 'Islamabad', 'Karachi'],
      registrationNumber: registrationNumber || '',
      mileageLimitKmPerDay: mileageLimitKmPerDay ? Number(mileageLimitKmPerDay) : 250,
      active: true,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet successfully.',
      car: newCar,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update car details (Admin only)
// @route   PUT /api/cars/:id
// @access  Private/Admin
const updateCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found.',
      });
    }

    const updatedCar = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle specifications updated successfully.',
      car: updatedCar,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or deactivate a car (Admin only)
// @route   DELETE /api/cars/:id
// @access  Private/Admin
const deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found.',
      });
    }

    // Check if there are active or confirmed bookings currently running
    const activeBookingCount = await Booking.countDocuments({
      car: car._id,
      bookingStatus: { $in: ['confirmed', 'active'] },
      returnDate: { $gte: new Date() },
    });

    if (activeBookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vehicle: It has ${activeBookingCount} ongoing or upcoming confirmed booking(s). Please deactivate it instead.`,
      });
    }

    // Safe soft delete/toggle or hard delete
    await Car.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted from fleet.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
};
