// Health Check Endpoint for Frontend
// This file serves as a simple health check that can be accessed at /health.json.js
// It returns a JSON response indicating the frontend is accessible

(function() {
  const health = {
    status: 'ok',
    service: 'frontend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : 'N/A'
  };
  
  // If running in Node.js context (e.g., during build)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = health;
  }
  
  // If accessed as a script, output JSON
  if (typeof document === 'undefined') {
    console.log(JSON.stringify(health, null, 2));
  }
})();

