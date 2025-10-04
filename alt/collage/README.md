# Boardgame Collage App

A web app for creating collages from BoardGameGeek board game images.

## Features
- Real-time search with multiple modes (starts with, contains, exact match)
- Dynamic grid sizing based on number of images
- Drag & drop reordering
- Export to PNG

## CORS Issue Solution

BoardGameGeek images have CORS restrictions that prevent direct export. Here are 3 solutions:

### Option 1: Use Public CORS Proxy (Default)
The app automatically tries to use public CORS proxy services. No setup required, but may be slower or unreliable.

### Option 2: Run Local Proxy Server (Recommended)
1. Install Node.js if you haven't already
2. Open terminal in the project directory
3. Run these commands:
   ```bash
   npm install
   npm start
   ```
4. The proxy server will run on http://localhost:3001
5. The app will automatically try the local proxy first

### Option 3: Manual Export
If both proxy methods fail, you can:
1. Right-click on the collage and "Save as image"
2. Use browser screenshot tools
3. Use print-to-PDF and convert to image

## Usage
1. Open `collage.html` in your web browser
2. Search for board games using the search box
3. Choose search mode (starts with, contains, exact match)
4. Click "Add" to add games to your collage
5. Drag & drop to reorder images
6. Click "Export as Image" to save your collage

## Files
- `collage.html` - Main application
- `image-proxy-server.js` - Local proxy server
- `package.json` - Node.js dependencies

## Troubleshooting
- If export is blank: Try running the local proxy server
- If images don't load: Check browser console for CORS errors
- If search is slow: BGG API has rate limits, this is normal

## Technical Details
The app uses:
- BoardGameGeek XML API for game data
- HTML2Canvas for image export
- Multiple CORS bypass strategies
- Real-time search with debouncing