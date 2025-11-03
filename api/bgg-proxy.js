// api/bgg-proxy.js - Final update: Adding &wait=1 to comply with BGG API best practices for server-side fetching.

module.exports = async (req, res) => {
    // --- 0. Initial Setup and Logging ---
    console.log('--- START: BGG Proxy Function Invoked ---');
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        console.log('CORS Preflight (OPTIONS) request handled.');
        return res.status(200).end();
    }

    // 1. Get the username. Prioritize 'username' (the BGG name) then fall back to 'user'.
    const username = req.query.username || req.query.user; 
    
    // Check for missing parameter
    if (!username) {
        const errorMsg = 'E-400: Missing BGG username. Please provide "user" or "username" query parameter.';
        console.error(errorMsg);
        console.log('--- END: BGG Proxy Failed (400) ---');
        return res.status(400).json({ 
            status: 400,
            step: 'Parameter Check',
            error: 'Bad Request', 
            message: errorMsg
        });
    }

    console.log(`User Check: Username received: "${username}"`);
    
    // 2. Construct the BGG API URL - CRITICAL FIX: Adding &wait=1
    const bggUrl = `https://boardgamegeek.com/xmlapi2/collection?username=${username}&stats=1&own=1&wait=1`;
    console.log(`URL Check: BGG target URL constructed: ${bggUrl}`);
    
    try {
        // 3. Fetch data from BGG with explicit headers
        console.log('Fetch Step: Attempting to call BGG API...');
        
        const bggResponse = await fetch(bggUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Vercel-BGG-Proxy/1.0 (Contact: YourGitHubHandle)',
                'Cache-Control': 'no-cache', 
                'Accept': 'text/xml'
            }
        });
        
        console.log(`Fetch Step: BGG API responded with Status ${bggResponse.status}`);

        // 4. Handle non-200 responses from BGG
        
        // BGG 202: The request is queued. (This is the expected response when BGG is generating the collection)
        if (bggResponse.status === 202) {
            const errorMsg = 'E-202: BGG API is busy. Request queued. Please try again in 5-10 seconds.';
            console.warn(errorMsg);
            console.log('--- END: BGG Proxy Queued (202) ---');
            return res.status(202).json({ 
                status: 202,
                step: 'BGG Fetch Status Check',
                error: 'Request Queued', 
                message: errorMsg
            });
        }
        
        // Handle all other failures (e.g., 401, 404, 429, 500 from BGG)
        if (!bggResponse.ok) {
            const status = bggResponse.status;
            let specificError = '';

            // --- REFINED ERROR CHECK FOR BGG API BLOCKS ---
            if (status === 401 || status === 403) {
                // This block should now be hit far less often thanks to &wait=1
                specificError = 'BGG API likely blocking the request (Unauthorized/Forbidden). This is often a temporary rate-limiting measure.';
            } else if (status === 429) {
                specificError = 'BGG API returned 429 Too Many Requests.';
            } else {
                specificError = 'General BGG API error or downtime.';
            }
            // ---------------------------------------------
            
            // We return 502 Bad Gateway to the client, but the JSON payload contains the BGG status (401)
            const errorMsg = `E-502: BGG API failure (BGG Status: ${status}). Detail: ${specificError}`;
            
            console.error(errorMsg);
            console.log('--- END: BGG Proxy Failed (502) ---');
            return res.status(502).json({ 
                status: status, // The BGG status 
                step: 'BGG Fetch Status Check',
                error: 'BGG API Error', 
                message: errorMsg
            });
        }

        // 5. Read the response text (it's XML)
        console.log('Response Step: BGG status is 200. Reading response body...');
        const xmlText = await bggResponse.text();

        // 6. Send the raw XML text back to the client
        console.log(`Response Step: Success! Fetched ${xmlText.length} bytes of XML. Sending to client.`);
        
        res.setHeader('Content-Type', 'text/xml');
        console.log('--- END: BGG Proxy Success (200) ---');
        return res.status(200).send(xmlText);

    } catch (error) {
        // 7. Handle network or internal code errors (Source of 500 Error)
        const errorMsg = `E-500: Internal Proxy Error. Check Vercel logs for stack trace. Message: ${error.message}`;
        console.error('*** UNCAUGHT EXCEPTION IN PROXY ***');
        console.error('Error Stack:', error.stack);
        console.log('--- END: BGG Proxy Failed (500) ---');
        
        return res.status(500).json({ 
            status: 500,
            step: 'Uncaught Exception',
            error: 'Internal Server Error', 
            message: errorMsg
        });
    }
};
