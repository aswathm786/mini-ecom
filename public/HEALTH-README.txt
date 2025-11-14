HEALTH ENDPOINT README
=====================

This directory contains health check endpoints for monitoring and load balancers.

HEALTH ENDPOINTS
----------------

1. Backend Health Check:
   URL: http://localhost:3000/api/health
   Method: GET
   Response: JSON
   
   Example Response:
   {
     "status": "ok",
     "mongoConnected": true,
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   
   Status Codes:
   - 200: Service is healthy
   - 500: Service is unhealthy (check logs)

2. Frontend Health Check:
   URL: http://localhost/health
   Method: GET
   Response: JSON or HTML
   
   Example Response:
   {
     "status": "ok",
     "service": "frontend",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }

USAGE
-----

Monitoring:
- Use these endpoints for uptime monitoring (UptimeRobot, Pingdom, etc.)
- Check every 1-5 minutes
- Alert if status is not "ok" or status code is not 200

Load Balancers:
- Configure health checks to use these endpoints
- Set failure threshold (e.g., 3 failures = remove from pool)
- Set success threshold (e.g., 2 successes = add back to pool)

Docker Health Checks:
- Already configured in docker-compose.yml
- Containers automatically restart if health check fails

TESTING
-------

Manual Test:
  curl http://localhost:3000/api/health
  curl http://localhost/health

Automated Test:
  ./scripts/healthcheck.sh

MONITORING
----------

Set up monitoring scripts:
  ./scripts/monitor_services.sh

This script checks:
- Container status
- Health endpoints
- MongoDB connectivity
- Automatic restart if unhealthy

For more information, see:
- docs/monitoring.md
- docs/troubleshooting.md

