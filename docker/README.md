# Docker Setup - Handmade Harmony

Docker Compose configuration for local development of Handmade Harmony e-commerce platform.

## 📚 Complete Documentation

For complete Docker deployment guides and production setup, see:

- **[Docker Deployment Guide](../docs/deployment/docker-deployment.md)** - Complete Docker setup for Windows and Linux
- **[Getting Started](../docs/getting-started/README.md)** - Quick start guide
- **[Production Checklist](../docs/deployment/production-checklist.md)** - Pre-launch checklist
- **[Deployment Overview](../docs/deployment/README.md)** - All deployment options

## Services

### MongoDB (`mongo`)
- **Image**: `mongo:7.0`
- **Port**: `27017`
- **Volume**: `mongo_data` (persistent data storage)
- **Health Check**: Enabled to ensure MongoDB is ready before backend starts

### Backend (`backend`)
- **Build**: `docker/Dockerfile.backend`
- **Port**: `5000`
- **Volumes**:
  - `../backend` - Source code (hot reload)
  - `../scripts` - Utility scripts
  - `../uploads` - Uploaded files
  - `../invoices` - Generated invoices
  - `../logs` - Application logs
  - `backend_node_modules` - Dependencies (cached)

### Frontend (`frontend`)
- **Build**: `docker/Dockerfile.frontend`
- **Port**: `3000`
- **Volumes**:
  - `../frontend` - Source code (hot reload)
  - `frontend_node_modules` - Dependencies (cached)

### Adminer (`adminer`) - Optional
- **Image**: `adminer:latest`
- **Port**: `8080`
- **Profile**: `tools` (only starts with `--profile tools`)
- **Purpose**: Web-based MongoDB admin interface

## Quick Start

### Start All Services

```bash
cd docker
docker-compose up -d
```

### Start with Adminer

```bash
docker-compose --profile tools up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

**Warning**: This will delete all MongoDB data!

## Development Workflow

### Backend Development

1. Start services: `docker-compose up -d`
2. Edit files in `../backend/` - changes are reflected immediately (hot reload)
3. View logs: `docker-compose logs -f backend`
4. Execute commands in container:
   ```bash
   docker-compose exec backend npm run build
   docker-compose exec backend node scripts/seed_admin.js
   ```

### Frontend Development

1. Start services: `docker-compose up -d`
2. Edit files in `../frontend/` - Vite hot module replacement works automatically
3. View logs: `docker-compose logs -f frontend`

### Database Access

#### Using MongoDB Shell

```bash
docker-compose exec mongo mongosh handmade_harmony
```

#### Using Adminer (Web UI)

1. Start with tools profile: `docker-compose --profile tools up -d`
2. Open http://localhost:8080
3. System: `MongoDB`
4. Server: `mongo`
5. Database: `handmade_harmony`
6. Leave username/password empty

## Environment Variables

Environment variables are loaded from `../.env` file. Make sure to:

1. Copy `.env.example` to `.env` in project root
2. Configure all required values
3. Restart containers after changing `.env`:
   ```bash
   docker-compose restart
   ```

## Volumes

### Persistent Volumes

- `mongo_data` - MongoDB data files (persists across restarts)
- `mongo_config` - MongoDB configuration files

### Named Volumes (Cached Dependencies)

- `backend_node_modules` - Backend npm packages (faster rebuilds)
- `frontend_node_modules` - Frontend npm packages (faster rebuilds)

### Bind Mounts (Development)

- Source code directories are bind-mounted for hot reload
- Uploads, invoices, and logs directories are bind-mounted for easy access

## Building Images

### Rebuild After Dockerfile Changes

```bash
docker-compose build
docker-compose up -d
```

### Rebuild Specific Service

```bash
docker-compose build backend
docker-compose up -d backend
```

## Troubleshooting

### MongoDB Not Ready

If backend fails to connect to MongoDB:

1. Check MongoDB health: `docker-compose ps mongo`
2. View MongoDB logs: `docker-compose logs mongo`
3. Wait for health check to pass (backend has `depends_on` with health condition)

### Port Already in Use

If ports 3000, 5000, or 27017 are already in use:

1. Stop conflicting services
2. Or modify port mappings in `docker-compose.yml`:
   ```yaml
   ports:
     - "5001:5000"  # Use 5001 instead of 5000
   ```

### Permission Issues (Linux)

If you encounter permission issues with volumes:

```bash
sudo chown -R $USER:$USER ../uploads ../invoices ../logs
```

### Clear Everything and Start Fresh

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove images (optional)
docker-compose rm -f

# Rebuild and start
docker-compose build
docker-compose up -d
```

## Production Considerations

This Docker Compose setup is optimized for **local development**. For production:

1. Use production-ready images (not `-alpine` variants if needed)
2. Remove volume mounts for source code (use COPY in Dockerfile)
3. Use environment-specific `.env` files
4. Set up proper networking and security groups
5. Use Docker secrets for sensitive data
6. Configure health checks and restart policies
7. Set up log aggregation
8. Use orchestration tools (Kubernetes, Docker Swarm) for scaling

## Network

All services are connected via `handmade_harmony_network` bridge network. Services can communicate using service names:

- Backend → MongoDB: `mongodb://mongo:27017/handmade_harmony`
- Frontend → Backend: `http://backend:5000` (internal) or `http://localhost:5000` (from host)

## License

[Your License Here]

