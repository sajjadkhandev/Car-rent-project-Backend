const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('../config/db');
const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { seedCars } = require('../utils/seedData');

const runSeeder = async () => {
  try {
    console.log('[DriveEase Seeder] Connecting to database...');
    await connectDB();

    console.log('[DriveEase Seeder] Purging old collections...');
    await User.deleteMany();
    await Car.deleteMany();
    await Booking.deleteMany();
    await Payment.deleteMany();

    console.log('[DriveEase Seeder] Creating default Admin and Customer accounts...');
    const adminPasswordHash = await User.hashPassword('Admin@DriveEase2026');
    const customerPasswordHash = await User.hashPassword('Customer@123456');

    const admin = await User.create({
      name: 'DriveEase Fleet Administrator',
      email: 'admin@driveease.pk',
      phone: '+92 300 1234567',
      city: 'Lahore',
      cnic: '35201-1234567-1',
      passwordHash: adminPasswordHash,
      role: 'admin',
      accountStatus: 'active',
    });

    const customer = await User.create({
      name: 'Hamza Tariq',
      email: 'customer@driveease.pk',
      phone: '+92 321 9876543',
      city: 'Islamabad',
      cnic: '61101-7654321-3',
      passwordHash: customerPasswordHash,
      role: 'customer',
      accountStatus: 'active',
    });

    console.log('[DriveEase Seeder] Seeding Pakistani car fleet...');
    const insertedCars = await Car.insertMany(seedCars);
    console.log(`[DriveEase Seeder] Seeded ${insertedCars.length} cars into fleet.`);

    console.log('[DriveEase Seeder] Creating initial real-world booking and verified payment records...');
    // Create a confirmed booking for Corolla Altis Grande
    const corolla = insertedCars[0];
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 2); // 2 days from now
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 5); // 5 days from now (3 rental days)

    const rentalDays = 3;
    const baseCost = rentalDays * corolla.dailyPrice;
    const taxes = Math.round(baseCost * 0.05);
    const totalCost = baseCost + taxes;

    const confirmedBooking = await Booking.create({
      bookingNumber: 'DE-2026-100291',
      customer: customer._id,
      car: corolla._id,
      pickupDate,
      returnDate,
      pickupTime: '11:00 AM',
      returnTime: '11:00 AM',
      pickupLocation: 'Allama Iqbal International Airport, Lahore',
      returnLocation: 'Gulberg III, Lahore',
      rentalDays,
      dailyPrice: corolla.dailyPrice,
      securityDeposit: corolla.securityDeposit,
      taxesAndFees: taxes,
      totalPrice: totalCost,
      bookingStatus: 'confirmed',
      paymentStatus: 'paid',
      driverName: 'Hamza Tariq',
      driverPhone: '+92 321 9876543',
      driverCnic: '61101-7654321-3',
      notes: 'Motorway M2 delivery requested with child seat.',
    });

    // Record verified payment for this confirmed booking
    await Payment.create({
      booking: confirmedBooking._id,
      customer: customer._id,
      amount: totalCost,
      method: 'Bank Transfer',
      status: 'verified',
      transactionReference: 'HBL-PK-982310492',
      notes: 'Verified via HBL Internet Banking remittance',
      receivedBy: admin._id,
      paidAt: new Date(),
    });

    // Create a pending booking for Honda Civic RS
    const civic = insertedCars[1];
    const civicPickup = new Date();
    civicPickup.setDate(civicPickup.getDate() + 7);
    const civicReturn = new Date();
    civicReturn.setDate(civicReturn.getDate() + 9);

    await Booking.create({
      bookingNumber: 'DE-2026-100292',
      customer: customer._id,
      car: civic._id,
      pickupDate: civicPickup,
      returnDate: civicReturn,
      pickupLocation: 'Blue Area, Islamabad',
      returnLocation: 'Islamabad International Airport',
      rentalDays: 2,
      dailyPrice: civic.dailyPrice,
      securityDeposit: civic.securityDeposit,
      taxesAndFees: Math.round(2 * civic.dailyPrice * 0.05),
      totalPrice: 2 * civic.dailyPrice + Math.round(2 * civic.dailyPrice * 0.05),
      bookingStatus: 'pending',
      paymentStatus: 'unpaid',
      driverName: 'Hamza Tariq',
      driverPhone: '+92 321 9876543',
    });

    console.log('----------------------------------------------------');
    console.log(' DriveEase Database Seeding Completed Successfully! ');
    console.log('----------------------------------------------------');
    console.log('Admin Account:');
    console.log('  Email:    admin@driveease.pk');
    console.log('  Password: Admin@DriveEase2026');
    console.log('');
    console.log('Customer Account:');
    console.log('  Email:    customer@driveease.pk');
    console.log('  Password: Customer@123456');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[DriveEase Seeder Error]', err);
    process.exit(1);
  }
};

runSeeder();
