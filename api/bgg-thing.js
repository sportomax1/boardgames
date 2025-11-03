// api/bgg-thing.js - BGG Thing API proxy with authentication

module.exports = async (req, res) => {
    console.log('--- START: BGG Thing Proxy Function Invoked ---');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        console.log('CORS Preflight (OPTIONS) request handled.');
        return res.status(200).end();
    }

    // 1. Check for BGG_API_TOKEN in environment variables
    const bggToken = process.env.BGG_API_TOKEN;
    if (!bggToken) {
        const errorMsg = 'E-500: BGG_API_TOKEN not configured in environment variables.';
        console.error(errorMsg);
        console.log('--- END: BGG Thing Proxy Failed (500) ---');
        return res.status(500).json({ 
            status: 500,
            step: 'Token Check',
            error: 'Configuration Error', 
            message: errorMsg
        });
    }

    // 2. Get the thing ID from query parameters
    const thingId = req.query.id || req.query.thingId;
    
    // Check for missing parameter
    if (!thingId) {
        const errorMsg = 'E-400: Missing thing ID. Please provide "id" or "thingId" query parameter.';
        console.error(errorMsg);
        console.log('--- END: BGG Thing Proxy Failed (400) ---');
        return res.status(400).json({ 
            status: 400,
            step: 'Parameter Check',
            error: 'Bad Request', 
            message: errorMsg
        });
    }

    console.log(`Thing ID Check: Thing ID received: "${thingId}"`);
    
    // 3. Construct the BGG API URL with stats=1 and wait=1
    const bggUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${thingId}&stats=1&wait=1`;
    console.log(`URL Check: BGG target URL constructed: ${bggUrl}`);
    
    try {
        // 4. Fetch data from BGG with authentication headers
        console.log('Fetch Step: Attempting to call BGG API...');
        
        const bggResponse = await fetch(bggUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Vercel-BGG-Thing-Proxy/1.0',
                'Authorization': `Bearer ${bggToken}`,
                'Cache-Control': 'no-cache', 
                'Accept': 'text/xml'
            }
        });
        
        console.log(`Fetch Step: BGG API responded with Status ${bggResponse.status}`);

        // 5. Handle non-200 responses from BGG
        
        // BGG 202: The request is queued
        if (bggResponse.status === 202) {
            const errorMsg = 'E-202: BGG API is busy. Request queued. Please try again in 5-10 seconds.';
            console.warn(errorMsg);
            console.log('--- END: BGG Thing Proxy Queued (202) ---');
            return res.status(202).json({ 
                status: 202,
                step: 'BGG Fetch Status Check',
                error: 'Request Queued', 
                message: errorMsg
            });
        }
        
        // Handle all other failures
        if (!bggResponse.ok) {
            const status = bggResponse.status;
            let specificError = '';

            if (status === 401 || status === 403) {
                specificError = 'BGG API authentication failed or access forbidden.';
            } else if (status === 404) {
                specificError = 'Thing ID not found on BGG.';
            } else if (status === 429) {
                specificError = 'BGG API returned 429 Too Many Requests.';
            } else {
                specificError = 'General BGG API error or downtime.';
            }
            
            const errorMsg = `E-502: BGG API failure (BGG Status: ${status}). Detail: ${specificError}`;
            
            console.error(errorMsg);
            console.log('--- END: BGG Thing Proxy Failed (502) ---');
            return res.status(502).json({ 
                status: status,
                step: 'BGG Fetch Status Check',
                error: 'BGG API Error', 
                message: errorMsg
            });
        }

        // 6. Read the response text (it's XML)
        console.log('Response Step: BGG status is 200. Reading response body...');
        const xmlText = await bggResponse.text();

        // 7. Send the raw XML text back to the client
        console.log(`Response Step: Success! Fetched ${xmlText.length} bytes of XML. Sending to client.`);
        
        res.setHeader('Content-Type', 'text/xml');
        console.log('--- END: BGG Thing Proxy Success (200) ---');
        return res.status(200).send(xmlText);

    } catch (error) {
        // 8. Handle network or internal code errors
        const errorMsg = `E-500: Internal Proxy Error. Check Vercel logs for stack trace. Message: ${error.message}`;
        console.error('*** UNCAUGHT EXCEPTION IN THING PROXY ***');
        console.error('Error Stack:', error.stack);
        console.log('--- END: BGG Thing Proxy Failed (500) ---');
        
        return res.status(500).json({ 
            status: 500,
            step: 'Uncaught Exception',
            error: 'Internal Server Error', 
            message: errorMsg
        });
    }
};