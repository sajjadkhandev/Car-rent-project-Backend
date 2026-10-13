const mongoose = require('mongoose');

const carSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: [true, 'Car brand is required'],
      trim: true,
      index: true,
    },
    model: {
      type: String,
      required: [true, 'Car model is required'],
      trim: true,
      index: true,
    },
    year: {
      type: Number,
      required: [true, 'Manufacturing year is required'],
      min: [2000, 'Year must be at least 2000'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
    },
    category: {
      type: String,
      required: [true, 'Car category is required'],
      enum: ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Crossover'],
      index: true,
    },
    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'At least one car image URL is required',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    dailyPrice: {
      type: Number,
      required: [true, 'Daily rental price in PKR is required'],
      min: [1000, 'Daily price must be at least PKR 1,000'],
      index: true,
    },
    securityDeposit: {
      type: Number,
      default: 15000,
      min: [0, 'Security deposit cannot be negative'],
    },
    transmission: {
      type: String,
      required: [true, 'Transmission type is required'],
      enum: ['Automatic', 'Manual'],
      index: true,
    },
    fuelType: {
      type: String,
      required: [true, 'Fuel type is required'],
      enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
      index: true,
    },
    seats: {
      type: Number,
      required: [true, 'Seating capacity is required'],
      min: [2, 'Must have at least 2 seats'],
      max: [15, 'Maximum 15 seats'],
    },
    mileageLimitKmPerDay: {
      type: Number,
      default: 250,
    },
    features: {
      type: [String],
      default: [
        'Air Conditioning',
        'Bluetooth',
        'Power Windows',
        'Backup Camera',
        'ABS Brakes',
      ],
    },
    cityLocations: {
      type: [String],
      default: ['Lahore', 'Karachi', 'Islamabad'],
      index: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    tripsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick text search and price sorting
carSchema.index({ brand: 'text', model: 'text', category: 'text' });
carSchema.index({ dailyPrice: 1, category: 1, active: 1 });

module.exports = mongoose.model('Car', carSchema);
