const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files from current directory (for your HTML file)
app.use(express.static('.'));

// Image proxy endpoint
app.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
        console.log('Proxying image:', imageUrl);
        
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        const buffer = await response.buffer();
        
        // Set appropriate headers
        res.set({
            'Content-Type': contentType,
            'Content-Length': buffer.length,
            'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        });
        
        res.send(buffer);
        
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch image', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Image proxy server running on http://localhost:${PORT}`);
    console.log('Use this URL pattern to proxy images:');
    console.log(`http://localhost:${PORT}/proxy-image?url=YOUR_IMAGE_URL`);
});