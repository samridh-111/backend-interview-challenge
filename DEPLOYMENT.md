# Cloud Deployment Guide

This guide provides multiple options for deploying the Task Sync API to the cloud.

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

Railway is the simplest option with automatic deployments from GitHub.

1. **Fork this repository** to your GitHub account
2. **Go to [Railway.app](https://railway.app)** and sign up with GitHub
3. **Click "New Project"** → "Deploy from GitHub repo"
4. **Select your forked repository**
5. **Railway will automatically detect** the Node.js app and deploy it
6. **Your API will be live** at a Railway-provided URL

**Environment Variables (Optional):**
- `NODE_ENV=production`
- `PORT=3000` (Railway sets this automatically)
- `DATABASE_URL=./data/tasks.sqlite3` (default)

### Option 2: Render (Free Tier Available)

1. **Fork this repository** to your GitHub account
2. **Go to [Render.com](https://render.com)** and sign up with GitHub
3. **Click "New"** → "Web Service"
4. **Connect your GitHub repository**
5. **Configure the service:**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
6. **Click "Create Web Service"**

**Environment Variables:**
- `NODE_ENV=production`
- `PORT=10000` (Render sets this automatically)

### Option 3: Vercel (Serverless)

1. **Fork this repository** to your GitHub account
2. **Go to [Vercel.com](https://vercel.com)** and sign up with GitHub
3. **Click "New Project"** → Import your repository
4. **Configure:**
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Click "Deploy"**

### Option 4: Docker Deployment

For any cloud provider that supports Docker:

1. **Build the Docker image:**
   ```bash
   docker build -t task-sync-api .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 -e NODE_ENV=production task-sync-api
   ```

## 🔧 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment | `development` | No |
| `DATABASE_URL` | SQLite database path | `./data/tasks.sqlite3` | No |
| `API_BASE_URL` | API base URL for sync | `http://localhost:3000/api` | No |
| `SYNC_BATCH_SIZE` | Batch size for sync operations | `50` | No |
| `SYNC_MAX_RETRIES` | Max retry attempts | `3` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `*` | No |

## 📋 Pre-Deployment Checklist

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Database path is writable in production

## 🧪 Testing Your Deployment

Once deployed, test your API endpoints:

```bash
# Health check
curl https://your-app-url.com/api/health

# Get all tasks
curl https://your-app-url.com/api/tasks

# Create a task
curl -X POST https://your-app-url.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Task", "description": "Test Description"}'

# Check sync status
curl https://your-app-url.com/api/status
```

## 🔍 Troubleshooting

### Common Issues:

1. **Database Permission Errors:**
   - Ensure the database directory is writable
   - Check file permissions in production

2. **Port Issues:**
   - Most cloud providers set the PORT environment variable
   - Use `process.env.PORT` in your code

3. **Build Failures:**
   - Ensure all dependencies are in `dependencies`, not `devDependencies`
   - Check Node.js version compatibility

4. **CORS Issues:**
   - Configure `ALLOWED_ORIGINS` environment variable
   - Update CORS settings for production

## 📊 Monitoring

### Health Check Endpoint
All deployments include a health check at `/api/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T10:00:00Z"
}
```

### Logs
Monitor your application logs through your cloud provider's dashboard:
- Railway: Project → Deployments → View Logs
- Render: Service → Logs
- Vercel: Project → Functions → View Function Logs

## 🔄 Continuous Deployment

All configurations support automatic deployments:
- **Railway:** Automatic on git push to main branch
- **Render:** Automatic on git push to main branch  
- **Vercel:** Automatic on git push to main branch

## 💰 Cost Considerations

- **Railway:** Free tier available, then $5/month
- **Render:** Free tier available, then $7/month
- **Vercel:** Free tier available, then $20/month
- **Docker:** Varies by cloud provider

## 🆘 Support

If you encounter issues:
1. Check the logs in your cloud provider's dashboard
2. Verify environment variables are set correctly
3. Ensure all tests pass locally
4. Check the troubleshooting section above

---

**Recommended:** Start with Railway for the easiest deployment experience!
