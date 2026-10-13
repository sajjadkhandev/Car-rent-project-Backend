const http = require('http');
const { app, startServer } = require('../server');
const mongoose = require('mongoose');

// Helper to make local HTTP requests to the running app
const makeRequest = (port, method, path, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const runBackendTests = async () => {
  console.log('--- Starting DriveEase Automated Backend Test Suite ---');
  const TEST_PORT = 5055;
  let server;
  try {
    server = await startServer(TEST_PORT);
  } catch (e) {
    console.error('Failed to start server for test:', e);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} | ${details}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const health = await makeRequest(TEST_PORT, 'GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'Health check endpoint returns 200 Healthy');

    // 2. Admin Login
    const adminLoginRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {}, {
      email: 'admin@driveease.pk',
      password: 'Admin@DriveEase2026',
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin login succeeds with valid token', JSON.stringify(adminLoginRes.body));
    const adminToken = adminLoginRes.body.token;

    // 3. Customer Registration
    const randEmail = `test.user.${Date.now()}@example.com`;
    const regRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/register', {}, {
      name: 'Ahmed Khan',
      email: randEmail,
      phone: '+92 300 9998877',
      password: 'SecurePassword123!',
      city: 'Lahore',
    });
    assert(regRes.status === 201 && regRes.body.token, 'Customer registration succeeds and returns JWT', JSON.stringify(regRes.body));
    const customerToken = regRes.body.token;

    // 4. Cars Catalog Query
    const carsRes = await makeRequest(TEST_PORT, 'GET', '/api/cars?limit=5');
    assert(carsRes.status === 200 && carsRes.body.cars.length > 0, `Cars catalog returns items (Found: ${carsRes.body.cars?.length})`);
    const testCar = carsRes.body.cars[0];

    // 5. Booking Quote Calculation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 10);
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 13);

    const quoteRes = await makeRequest(TEST_PORT, 'POST', '/api/bookings/quote', {}, {
      carId: testCar._id,
      pickupDate: tomorrow.toISOString(),
      returnDate: threeDaysLater.toISOString(),
    });
    assert(quoteRes.status === 200 && quoteRes.body.pricing.rentalDays === 3, 'Rental pricing quote calculates correct duration & PKR amounts');

    // 6. Create Booking
    const bookingRes = await makeRequest(TEST_PORT, 'POST', '/api/bookings', { Authorization: `Bearer ${customerToken}` }, {
      carId: testCar._id,
      pickupDate: tomorrow.toISOString(),
      returnDate: threeDaysLater.toISOString(),
      pickupLocation: 'Gulberg III, Lahore',
      returnLocation: 'Allama Iqbal Airport, Lahore',
      driverName: 'Ahmed Khan',
      driverPhone: '+92 300 9998877',
      driverCnic: '35201-9988776-5',
    });
    assert(bookingRes.status === 201 && bookingRes.body.booking._id, 'Booking reservation submitted successfully');
    const createdBooking = bookingRes.body.booking;

    // 7. OVERLAP COLLISION GUARD TEST:
    // Attempting to book the SAME car for an overlapping date range must fail with 409 Conflict!
    const overlapPickup = new Date();
    overlapPickup.setDate(overlapPickup.getDate() + 11); // Inside the 10-13 range
    const overlapReturn = new Date();
    overlapReturn.setDate(overlapReturn.getDate() + 14);

    const overlapRes = await makeRequest(TEST_PORT, 'POST', '/api/bookings', { Authorization: `Bearer ${customerToken}` }, {
      carId: testCar._id,
      pickupDate: overlapPickup.toISOString(),
      returnDate: overlapReturn.toISOString(),
      pickupLocation: 'Gulberg, Lahore',
      returnLocation: 'Gulberg, Lahore',
    });
    assert(overlapRes.status === 409, 'Overlapping booking correctly REJECTED by backend (HTTP 409 Conflict)', `Received status ${overlapRes.status}`);

    // 8. Admin Confirm Booking
    const confirmRes = await makeRequest(TEST_PORT, 'PATCH', `/api/admin/bookings/${createdBooking._id}/status`, { Authorization: `Bearer ${adminToken}` }, {
      status: 'confirmed',
      adminNotes: 'Verified customer documents and reserved vehicle.',
    });
    assert(confirmRes.status === 200 && confirmRes.body.booking.bookingStatus === 'confirmed', 'Admin successfully updates booking status to "confirmed"');

    // 9. Admin Record Offline Payment
    const paymentRes = await makeRequest(TEST_PORT, 'POST', '/api/admin/payments', { Authorization: `Bearer ${adminToken}` }, {
      bookingId: createdBooking._id,
      amount: createdBooking.totalPrice,
      method: 'Cash on Pickup',
      transactionReference: 'CASH-REC-001',
      notes: 'Customer paid upfront in Pakistani Rupees at branch',
    });
    assert(paymentRes.status === 201 && paymentRes.body.updatedBookingPaymentStatus === 'paid', 'Admin records verified payment & updates booking paymentStatus to "paid"');

    // 10. Admin Dashboard Revenue & Metrics Check
    const dashRes = await makeRequest(TEST_PORT, 'GET', '/api/admin/dashboard', { Authorization: `Bearer ${adminToken}` });
    assert(dashRes.status === 200 && dashRes.body.stats.totalVerifiedRevenue > 0, `Admin dashboard reflects verified revenue (PKR ${dashRes.body.stats?.totalVerifiedRevenue?.toLocaleString()})`);

    // 11. Customer My Bookings
    const myBookingsRes = await makeRequest(TEST_PORT, 'GET', '/api/bookings/my', { Authorization: `Bearer ${customerToken}` });
    assert(myBookingsRes.status === 200 && myBookingsRes.body.bookings.length >= 1, 'Customer can view their own booking history');

    // 12. Public Contact Form Submission
    const contactRes = await makeRequest(TEST_PORT, 'POST', '/api/contact', {}, {
      name: 'Usman Ali',
      email: 'usman@example.com',
      phone: '+92 333 4445566',
      subject: 'Inquiry regarding Fortuner rental for Hunza trip',
      message: 'Hello, what are the requirements for renting Fortuner for a 7-day Northern trip?',
    });
    assert(contactRes.status === 201, 'Public contact message submitted successfully');

    console.log('----------------------------------------------------');
    console.log(`Test Execution Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log('----------------------------------------------------');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
};

runBackendTests();
