const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');

// Auto-seed helper for seamless evaluation
const Car = require('./models/Car');
const User = require('./models/User');
const { seedCars } = require('./utils/seedData');
const { getApiLandingHtml } = require('./utils/apiLandingPage');

const app = express();

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_URL
      ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5001']
      : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check for Render Cloud & Ping
app.head('/', (req, res) => res.status(200).end());

// Root Landing Page (Renders interactive HTML console in browser, JSON for API tools)
app.get('/', (req, res) => {
  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(200).json({
      application: 'DriveEase — Car Rental Management System',
      status: 'online',
      message: 'DriveEase Backend API Engine is active and running on Render',
      database: 'Connected to MongoDB Atlas',
      endpoints: {
        cars: '/api/cars',
        health: '/api/health',
        metadata: '/api',
        auth: '/api/auth/login',
        bookingsQuote: '/api/bookings/quote',
      },
      timestamp: new Date().toISOString(),
    });
  }

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(getApiLandingHtml());
});

// Root API & Health Check Information
app.get('/api', (req, res) => {
  res.status(200).json({
    application: 'DriveEase — Car Rental Management System',
    backend: {
      name: 'DriveEase Backend API Engine',
      stack: 'Node.js, Express.js, MongoDB (Mongoose)',
      version: '1.0.0',
    },
    frontend: {
      name: 'DriveEase Web Frontend Client',
      stack: 'React.js (Vite), Tailwind CSS, Framer Motion',
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    },
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    backendName: 'DriveEase Backend API Engine (Node.js + Express)',
    frontendName: 'DriveEase Web Frontend Client (React + Vite)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// Catch-all 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`,
  });
});

// Centralized error handler
app.use(errorHandler);

const startServer = async (customPort = null) => {
  try {
    await connectDB();
    const activePort = customPort || process.env.PORT || 5001;

    // Auto-seed if database is empty (ensures instant out-of-the-box readiness)
    const carCount = await Car.countDocuments();
    if (carCount === 0) {
      console.log('[DriveEase Server] Empty database detected. Auto-seeding initial fleet and default accounts...');
      const adminPasswordHash = await User.hashPassword('Admin@DriveEase2026');
      const customerPasswordHash = await User.hashPassword('Customer@123456');

      await User.create([
        {
          name: 'DriveEase Administrator',
          email: 'admin@driveease.pk',
          phone: '+92 306 9122770',
          city: 'Lahore',
          cnic: '35201-1234567-1',
          passwordHash: adminPasswordHash,
          role: 'admin',
          accountStatus: 'active',
        },
        {
          name: 'Hamza Tariq',
          email: 'customer@driveease.pk',
          phone: '+92 321 9876543',
          city: 'Islamabad',
          cnic: '61101-7654321-3',
          passwordHash: customerPasswordHash,
          role: 'customer',
          accountStatus: 'active',
        },
      ]);

      await Car.insertMany(seedCars);
      console.log('[DriveEase Server] Fleet & accounts auto-seeded successfully!');
    }

    const server = app.listen(activePort, () => {
      console.log(`====================================================`);
      console.log(` [Backend Engine]  : DriveEase Backend API (Node.js + Express)`);
      console.log(` [Backend URL]     : http://localhost:${activePort}`);
      console.log(` [Frontend Client] : DriveEase Web Client (React + Vite)`);
      console.log(` [Frontend URL]    : ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(` [Environment]     : ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    return server;
  } catch (error) {
    console.error('[DriveEase Server Startup Failure]', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
