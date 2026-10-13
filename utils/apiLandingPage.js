const getApiLandingHtml = (backendUrl = 'https://car-rent-project-backend.onrender.com') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DriveEase — Backend REST API Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 50% 0%, #0d1b3e 0%, #060b19 100%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .container {
      width: 100%;
      max-width: 860px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 102, 255, 0.12);
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .badge-live {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 12px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .badge-version {
      background: rgba(0, 102, 255, 0.15);
      border: 1px solid rgba(0, 102, 255, 0.3);
      color: #60a5fa;
    }
    .badge-db {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.2;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #60a5fa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.lead {
      color: #94a3b8;
      font-size: 0.975rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1.25rem;
      border-radius: 14px;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: #0066ff;
      color: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 102, 255, 0.4);
    }
    .btn-primary:hover {
      background: #0052cc;
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 1rem;
    }
    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .endpoint-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      background: rgba(2, 6, 23, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .endpoint-card:hover {
      background: rgba(0, 102, 255, 0.08);
      border-color: rgba(0, 102, 255, 0.3);
      transform: translateX(4px);
    }
    .endpoint-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
    }
    .method {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .method-get {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .method-post {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.825rem;
      color: #e2e8f0;
      font-weight: 600;
    }
    .desc {
      font-size: 0.8rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .arrow {
      color: #475569;
      font-size: 0.9rem;
      transition: transform 0.15s ease, color 0.15s ease;
    }
    .endpoint-card:hover .arrow {
      color: #60a5fa;
      transform: translateX(3px);
    }
    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    footer a {
      color: #64748b;
      text-decoration: none;
    }
    footer a:hover {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge-row">
      <div class="badge badge-live">
        <div class="pulse-dot"></div>
        API Service Live
      </div>
      <div class="badge badge-version">v1.0.0 Express REST</div>
      <div class="badge badge-db">MongoDB Atlas Connected</div>
    </div>

    <h1>DriveEase API Engine</h1>
    <p class="lead">
      The backend engine for <strong>DriveEase — Car Rental Management System</strong> is active and running successfully on Render. REST API endpoints are fully operational for vehicle catalogs, customer reservations, and authentication.
    </p>

    <div class="actions-grid">
      <a href="/api/cars" class="btn btn-primary" target="_blank">
        🚗 Browse Cars API
      </a>
      <a href="/api/health" class="btn btn-secondary" target="_blank">
        🩺 Health Check
      </a>
      <a href="/api" class="btn btn-secondary" target="_blank">
        📋 API JSON Schema
      </a>
    </div>

    <div class="section-title">Available Public API Routes</div>
    <div class="endpoints-list">
      <a href="/api/cars" class="endpoint-card" target="_blank">
        <div class="endpoint-left">
          <span class="method method-get">GET</span>
          <span class="path">/api/cars</span>
        </div>
        <div class="desc">Fleet listing with category, city & price filters</div>
        <span class="arrow">→</span>
      </a>

      <a href="/api/health" class="endpoint-card" target="_blank">
        <div class="endpoint-left">
          <span class="method method-get">GET</span>
          <span class="path">/api/health</span>
        </div>
        <div class="desc">System health, environment & latency check</div>
        <span class="arrow">→</span>
      </a>

      <a href="/api" class="endpoint-card" target="_blank">
        <div class="endpoint-left">
          <span class="method method-get">GET</span>
          <span class="path">/api</span>
        </div>
        <div class="desc">Backend & frontend metadata identification</div>
        <span class="arrow">→</span>
      </a>

      <div class="endpoint-card">
        <div class="endpoint-left">
          <span class="method method-post">POST</span>
          <span class="path">/api/bookings/quote</span>
        </div>
        <div class="desc">Real-time Pakistani Rupee price quote & availability check</div>
        <span class="arrow" style="opacity: 0.3;">•</span>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-left">
          <span class="method method-post">POST</span>
          <span class="path">/api/auth/login</span>
        </div>
        <div class="desc">JWT secure authentication for customers & administrators</div>
        <span class="arrow" style="opacity: 0.3;">•</span>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-left">
          <span class="method method-post">POST</span>
          <span class="path">/api/contact</span>
        </div>
        <div class="desc">Customer inquiries & hotline messaging endpoint</div>
        <span class="arrow" style="opacity: 0.3;">•</span>
      </div>
    </div>

    <footer>
      <span>DriveEase Pakistan (Pvt.) Ltd.</span>
      <span>•</span>
      <span>Helpline: +92 306 9122770</span>
      <span>•</span>
      <span>Render Cloud Platform</span>
    </footer>
  </div>
</body>
</html>
`;

module.exports = { getApiLandingHtml };
