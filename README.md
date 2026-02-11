# Bangumi Manager

A simple and beautiful anime management website built with Vue 3 and Cloudflare Workers.

## Features

- Search anime using Bangumi API
- View anime details including episodes, characters, and ratings
- Responsive design with Element Plus UI
- Frontend hosted on GitHub Pages
- Backend API on Cloudflare Workers

## Project Structure

```
bangumi-manager/
├── frontend/          # Vue 3 frontend
├── backend/           # Cloudflare Workers backend
└── README.md
```

## Setup

### Backend (Cloudflare Workers)

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure Cloudflare Workers:
   - Create a Cloudflare account if you don't have one
   - Install Wrangler CLI: `npm install -g wrangler`
   - Login: `wrangler login`
   - Update `wrangler.toml` with your desired subdomain

3. Deploy:
   ```bash
   npm run deploy
   ```

### Frontend (GitHub Pages)

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Update API base URL:
   - Create `.env.production` file with:
     ```
     VITE_API_BASE=https://your-worker-subdomain.workers.dev/api
     ```

3. Build:
   ```bash
   npm run build
   ```

4. Deploy to GitHub Pages:
   - Create a GitHub repository
   - Push the built `dist` folder to `gh-pages` branch
   - Enable GitHub Pages in repository settings

## Development

### Backend Development

```bash
cd backend
npm run dev
```

### Frontend Development

```bash
cd frontend
npm run dev
```

## API Endpoints

- `GET /api/search?q={query}` - Search anime
- `GET /api/anime/{id}` - Get anime details
- `GET /api/subject/{id}` - Get raw subject details
- `GET /api/health` - Health check

## Environment Variables

### Frontend
- `VITE_API_BASE` - Base URL for API requests

### Backend
- `BANGUMI_API_BASE` - Base URL for Bangumi API (default: https://api.bgm.tv)

## License

MIT