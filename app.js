let simpleView = true;

// Ensure the button label matches the default view on load
document.addEventListener('DOMContentLoaded', function() {
    const simpleBtn = document.getElementById('simpleViewBtn');
    if (simpleBtn) simpleBtn.textContent = 'Full View';
});

// Toggle Simple View
document.addEventListener('DOMContentLoaded', function() {
    const simpleBtn = document.getElementById('simpleViewBtn');
    if (simpleBtn) {
        simpleBtn.onclick = function() {
            simpleView = !simpleView;
            document.body.classList.toggle('simple-view', simpleView);
            simpleBtn.textContent = simpleView ? 'Full View' : 'Simple View';
            renderTablePage(currentPage);
        };
    }
});
// Toggle between mobile and desktop view
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleViewBtn');
    if (toggleBtn) {
        toggleBtn.onclick = function() {
            const body = document.body;
            const isMobile = body.classList.toggle('mobile-view');
            toggleBtn.textContent = isMobile ? 'Switch to Desktop View' : 'Switch to Mobile View';
        };
    }
});
// Store the unfiltered list for toggling
let originalItems = [];

// Pairwise ranking state
let rankingState = {
    isActive: false,
    games: [],
    currentPair: null,
    comparisons: [],
    currentIndex: 0,
    gameStats: new Map(), // Track appearances and win-loss records
    pairHistory: [] // For back functionality
};

// Sample games for testing (when API is not available)
const sampleGames = [
    {
        objectid: "1",
        name: "Azul",
        image: "https://cf.geekdo-images.com/original/img/oKuPfBQ9PIZ9wfCfUIGIeL0SCb0=/0x0/pic3718275.jpg",
        thumbnail: "https://cf.geekdo-images.com/thumb/img/oKuPfBQ9PIZ9wfCfUIGIeL0SCb0=/fit-in/200x150/pic3718275.jpg",
        year: 2017,
        own: "1",
        bayesaverage: "7.8",
        statusStr: "own=1<br>prevowned=0<br>fortrade=0<br>want=0<br>wanttoplay=0<br>wanttobuy=0<br>wishlist=0<br>wishlistpriority=0<br>preordered=0"
    },
    {
        objectid: "2", 
        name: "Wingspan",
        image: "https://cf.geekdo-images.com/original/img/A-0yDJkve0avEicYQ4HoNO-HkK8=/0x0/pic4458123.jpg",
        thumbnail: "https://cf.geekdo-images.com/thumb/img/A-0yDJkve0avEicYQ4HoNO-HkK8=/fit-in/200x150/pic4458123.jpg",
        year: 2019,
        own: "0",
        bayesaverage: "8.1",
        statusStr: "own=0<br>prevowned=0<br>fortrade=0<br>want=1<br>wanttoplay=0<br>wanttobuy=1<br>wishlist=0<br>wishlistpriority=0<br>preordered=0"
    },
    {
        objectid: "3",
        name: "Ticket to Ride",
        image: "https://cf.geekdo-images.com/original/img/pNmQ9-pJYPQa6MXHOtPeyaLW_EU=/0x0/pic38668.jpg",
        thumbnail: "https://cf.geekdo-images.com/thumb/img/pNmQ9-pJYPQa6MXHOtPeyaLW_EU=/fit-in/200x150/pic38668.jpg",
        year: 2004,
        own: "1", 
        bayesaverage: "7.4",
        statusStr: "own=1<br>prevowned=0<br>fortrade=0<br>want=0<br>wanttoplay=0<br>wanttobuy=0<br>wishlist=0<br>wishlistpriority=0<br>preordered=0"
    },
    {
        objectid: "4",
        name: "Splendor",
        image: "https://cf.geekdo-images.com/original/img/rwWLtFkSJqM4CNwU5r-PbUiYTiA=/0x0/pic1904079.jpg",
        thumbnail: "https://cf.geekdo-images.com/thumb/img/rwWLtFkSJqM4CNwU5r-PbUiYTiA=/fit-in/200x150/pic1904079.jpg",
        year: 2014,
        own: "0",
        bayesaverage: "7.6",
        statusStr: "own=0<br>prevowned=0<br>fortrade=0<br>want=1<br>wanttoplay=1<br>wanttobuy=0<br>wishlist=0<br>wishlistpriority=0<br>preordered=0"
    },
    {
        objectid: "5",
        name: "Catan",
        image: "https://cf.geekdo-images.com/original/img/A-0yDJkve0avEicYQ4HoNO-HkK8=/0x0/pic2419375.jpg",
        thumbnail: "https://cf.geekdo-images.com/thumb/img/A-0yDJkve0avEicYQ4HoNO-HkK8=/fit-in/200x150/pic2419375.jpg",
        year: 1995,
        own: "1",
        bayesaverage: "7.2",
        statusStr: "own=1<br>prevowned=0<br>fortrade=0<br>want=0<br>wanttoplay=0<br>wanttobuy=0<br>wishlist=0<br>wishlistpriority=0<br>preordered=0"
    }
];

// Initialize game stats for ranking
function initializeGameStats(games) {
    rankingState.gameStats.clear();
    games.forEach(game => {
        rankingState.gameStats.set(game.objectid, {
            appearances: 0,
            wins: 0,
            losses: 0
        });
    });
}

// Start pairwise ranking
function startPairwiseRanking() {
    const games = originalItems.length > 0 ? 
        originalItems.filter(item => Number(item.own) > 0) : 
        sampleGames;
    
    if (games.length < 2) {
        alert('Need at least 2 games to rank!');
        return;
    }
    
    rankingState.isActive = true;
    rankingState.games = [...games];
    rankingState.comparisons = [];
    rankingState.currentIndex = 0;
    rankingState.pairHistory = [];
    
    initializeGameStats(games);
    
    // Hide main interface, show ranking interface
    document.getElementById('results').style.display = 'none';
    document.getElementById('rankingInterface').style.display = 'block';
    
    generateComparisonPairs();
    showNextComparison();
}

// Generate all possible pairs for comparison
function generateComparisonPairs() {
    const pairs = [];
    for (let i = 0; i < rankingState.games.length; i++) {
        for (let j = i + 1; j < rankingState.games.length; j++) {
            pairs.push([rankingState.games[i], rankingState.games[j]]);
        }
    }
    rankingState.comparisons = shuffleArray(pairs);
}

// Shuffle array utility
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Show next comparison
function showNextComparison() {
    if (rankingState.currentIndex >= rankingState.comparisons.length) {
        showFinalRankings();
        return;
    }
    
    const pair = rankingState.comparisons[rankingState.currentIndex];
    rankingState.currentPair = pair;
    
    // Update appearance stats
    pair.forEach(game => {
        const stats = rankingState.gameStats.get(game.objectid);
        if (stats) stats.appearances++;
    });
    
    renderComparisonInterface(pair);
}

// Render the comparison interface
function renderComparisonInterface(pair) {
    const [game1, game2] = pair;
    const progress = ((rankingState.currentIndex + 1) / rankingState.comparisons.length) * 100;
    
    const html = `
        <div class="ranking-container">
            <div class="ranking-header">
                <h2>Tier Ranking - Choose Your Preference</h2>
                <div class="ranking-progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                    <div style="text-align: center; margin-top: 5px;">
                        Comparison ${rankingState.currentIndex + 1} of ${rankingState.comparisons.length}
                    </div>
                </div>
            </div>
            
            <div class="comparison-area">
                <div class="game-card" onclick="selectGame('${game1.objectid}')">
                    <img src="${game1.thumbnail || game1.image || 'https://via.placeholder.com/150'}" 
                         alt="${game1.name}" class="game-image" onerror="this.src='https://via.placeholder.com/150'">
                    <div class="game-name">${game1.name}</div>
                    <div class="game-stats">
                        Year: ${game1.year || 'N/A'}<br>
                        Appearances: ${rankingState.gameStats.get(game1.objectid)?.appearances || 0}<br>
                        Record: ${rankingState.gameStats.get(game1.objectid)?.wins || 0}W - ${rankingState.gameStats.get(game1.objectid)?.losses || 0}L
                    </div>
                </div>
                
                <div style="display: flex; align-items: center; font-size: 24px; font-weight: bold; color: #666;">
                    VS
                </div>
                
                <div class="game-card" onclick="selectGame('${game2.objectid}')">
                    <img src="${game2.thumbnail || game2.image || 'https://via.placeholder.com/150'}" 
                         alt="${game2.name}" class="game-image" onerror="this.src='https://via.placeholder.com/150'">
                    <div class="game-name">${game2.name}</div>
                    <div class="game-stats">
                        Year: ${game2.year || 'N/A'}<br>
                        Appearances: ${rankingState.gameStats.get(game2.objectid)?.appearances || 0}<br>
                        Record: ${rankingState.gameStats.get(game2.objectid)?.wins || 0}W - ${rankingState.gameStats.get(game2.objectid)?.losses || 0}L
                    </div>
                </div>
            </div>
            
            <div class="ranking-controls">
                <button class="back-btn" onclick="goBackOneStep()" ${rankingState.pairHistory.length === 0 ? 'disabled' : ''}>
                    ← Back
                </button>
                <button class="skip-btn" onclick="skipComparison()">
                    Skip This Pair
                </button>
                <button class="exit-btn" onclick="exitRanking()">
                    Exit Ranking
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('rankingInterface').innerHTML = html;
}

// Handle game selection
function selectGame(winnerId) {
    const [game1, game2] = rankingState.currentPair;
    const loserId = winnerId === game1.objectid ? game2.objectid : game1.objectid;
    
    // Store this choice for back functionality
    rankingState.pairHistory.push({
        pair: [...rankingState.currentPair],
        winner: winnerId,
        loser: loserId,
        index: rankingState.currentIndex
    });
    
    // Update win-loss records
    const winnerStats = rankingState.gameStats.get(winnerId);
    const loserStats = rankingState.gameStats.get(loserId);
    
    if (winnerStats) winnerStats.wins++;
    if (loserStats) loserStats.losses++;
    
    // Move to next comparison
    rankingState.currentIndex++;
    showNextComparison();
}

// Go back one step
function goBackOneStep() {
    if (rankingState.pairHistory.length === 0) return;
    
    const lastChoice = rankingState.pairHistory.pop();
    
    // Revert win-loss records
    const winnerStats = rankingState.gameStats.get(lastChoice.winner);
    const loserStats = rankingState.gameStats.get(lastChoice.loser);
    
    if (winnerStats) winnerStats.wins--;
    if (loserStats) loserStats.losses--;
    
    // Revert appearance counts
    lastChoice.pair.forEach(game => {
        const stats = rankingState.gameStats.get(game.objectid);
        if (stats) stats.appearances--;
    });
    
    // Go back to previous comparison
    rankingState.currentIndex = lastChoice.index;
    rankingState.currentPair = lastChoice.pair;
    
    renderComparisonInterface(lastChoice.pair);
}

// Skip current comparison
function skipComparison() {
    rankingState.currentIndex++;
    showNextComparison();
}

// Exit ranking mode
function exitRanking() {
    rankingState.isActive = false;
    document.getElementById('rankingInterface').style.display = 'none';
    document.getElementById('results').style.display = 'block';
}

// Calculate final rankings based on win-loss records
function calculateFinalRankings() {
    const rankings = rankingState.games.map(game => {
        const stats = rankingState.gameStats.get(game.objectid);
        return {
            game,
            stats,
            winRate: stats.appearances > 0 ? (stats.wins / stats.appearances) : 0,
            totalGames: stats.appearances
        };
    });
    
    // Sort by win rate, then by total games played
    rankings.sort((a, b) => {
        if (b.winRate !== a.winRate) {
            return b.winRate - a.winRate;
        }
        return b.totalGames - a.totalGames;
    });
    
    return rankings;
}

// Show final rankings
function showFinalRankings() {
    const rankings = calculateFinalRankings();
    
    let html = `
        <div class="ranking-container">
            <div class="ranking-header">
                <h2>🏆 Final Tier Rankings</h2>
                <p>Based on ${rankingState.pairHistory.length} comparisons</p>
            </div>
            
            <div class="final-rankings">
                <ol class="ranking-list">
    `;
    
    rankings.forEach((item, index) => {
        html += `
            <li class="ranking-item">
                <span class="ranking-position">#${index + 1}</span>
                <div class="ranking-game-info">
                    <div class="ranking-game-name">${item.game.name}</div>
                    <div class="ranking-game-stats">
                        Win Rate: ${(item.winRate * 100).toFixed(1)}% 
                        (${item.stats.wins}W - ${item.stats.losses}L) 
                        | Appearances: ${item.stats.appearances}
                        | Year: ${item.game.year || 'N/A'}
                    </div>
                </div>
            </li>
        `;
    });
    
    html += `
                </ol>
            </div>
            
            <div class="ranking-controls">
                <button class="back-btn" onclick="startPairwiseRanking()">
                    🔄 Start New Ranking
                </button>
                <button class="exit-btn" onclick="exitRanking()">
                    📋 Back to Collection
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('rankingInterface').innerHTML = html;
}

// Add event listener for Tier Rank button
document.addEventListener('DOMContentLoaded', () => {
    const tierRankBtn = document.getElementById('tierRankBtn');
    if (tierRankBtn) {
        tierRankBtn.addEventListener('click', startPairwiseRanking);
    }
});

document.getElementById('fetchBtn').addEventListener('click', async () => {
    const timingInfo = document.getElementById('timingInfo');
    const startTime = new Date();
    timingInfo.textContent = `Start: ${startTime.toLocaleTimeString()}`;
    document.getElementById('results').innerHTML = 'Loading...';
    try {
        const apiBase = 'https://boardgamegeek.com/xmlapi2/collection?stats=1&username=sportomax';
        const response = await fetch(apiBase);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const items = xmlDoc.querySelectorAll('item');
    allItems = [];
    originalItems = [];
        items.forEach(item => {
            const objecttype = item.getAttribute('objecttype');
            const objectid = item.getAttribute('objectid');
            const subtype = item.getAttribute('subtype');
            const collid = item.getAttribute('collid');
            const name = item.querySelector('name')?.textContent || 'N/A';
            const yearpublishedStr = item.querySelector('yearpublished')?.textContent || 'N/A';
            const year = Number(yearpublishedStr) || 0;
            const image = item.querySelector('image')?.textContent || '';
            const thumbnail = item.querySelector('thumbnail')?.textContent || '';
            const status = item.querySelector('status');
            const own = status?.getAttribute('own');
            const prevowned = status?.getAttribute('prevowned');
            const fortrade = status?.getAttribute('fortrade');
            const want = status?.getAttribute('want');
            const wanttoplay = status?.getAttribute('wanttoplay');
            const wanttobuy = status?.getAttribute('wanttobuy');
            const wishlist = status?.getAttribute('wishlist');
            const preordered = status?.getAttribute('preordered');
            const lastmodified = status?.getAttribute('lastmodified');
            const wishlistpriority = status?.getAttribute('wishlistpriority');
            let numplays = item.getAttribute('numplays');
            if (!numplays) {
                const numplaysElem = item.querySelector('numplays');
                numplays = numplaysElem ? numplaysElem.textContent : '';
            }
            const stats = item.querySelector('stats');
            const minplayers = stats?.getAttribute('minplayers') || '';
            const maxplayers = stats?.getAttribute('maxplayers') || '';
            const minplaytime = stats?.getAttribute('minplaytime') || '';
            const maxplaytime = stats?.getAttribute('maxplaytime') || '';
            const playingtime = stats?.getAttribute('playingtime') || '';
            const numowned = stats?.getAttribute('numowned') || '';
            const rating = stats?.querySelector('rating');
            const ratingValue = rating?.getAttribute('value') || '';
            const usersrated = rating?.querySelector('usersrated')?.getAttribute('value') || '';
            const average = rating?.querySelector('average')?.getAttribute('value') || '';
            const bayesaverage = rating?.querySelector('bayesaverage')?.getAttribute('value') || '';
            const stddev = rating?.querySelector('stddev')?.getAttribute('value') || '';
            const median = rating?.querySelector('median')?.getAttribute('value') || '';
            let ranksStr = '';
            const ranks = rating?.querySelectorAll('ranks > rank');
            if (ranks && ranks.length > 0) {
                ranks.forEach(rank => {
                    const type = rank.getAttribute('type');
                    const id = rank.getAttribute('id');
                    const name = rank.getAttribute('name');
                    const friendlyname = rank.getAttribute('friendlyname');
                    const value = rank.getAttribute('value');
                    const bayesavg = rank.getAttribute('bayesaverage');
                    ranksStr += `${friendlyname || name}: ${value} (Bayes: ${bayesavg})<br>`;
                });
            }
            const statusStr = `own=${own}<br>prevowned=${prevowned}<br>fortrade=${fortrade}<br>want=${want}<br>wanttoplay=${wanttoplay}<br>wanttobuy=${wanttobuy}<br>wishlist=${wishlist}<br>wishlistpriority=${wishlistpriority}<br>preordered=${preordered}`;
            const itemObj = {
                objecttype, objectid, subtype, collid, name, yearpublished: yearpublishedStr, year, image, thumbnail, statusStr, lastmodified, numplays, minplayers, maxplayers, minplaytime, maxplaytime, playingtime, numowned, ratingValue, usersrated, average, bayesaverage, stddev, median, ranksStr, own, prevowned
            };
            allItems.push(itemObj);
            originalItems.push(itemObj);
        });
        currentPage = 1;
        renderTablePage(currentPage);
        const endTime = new Date();
        const durationMs = endTime - startTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    // Show only the total counts here; filtered counts will be handled in renderTablePage
    timingInfo.textContent = `Start: ${startTime.toLocaleTimeString()} | End: ${endTime.toLocaleTimeString()} | Total: ${minutes}m ${seconds}s | Records: ${originalItems.length} | Pages: ${Math.ceil(originalItems.length / itemsPerPage)}`;
    } catch (err) {
        console.log('API fetch failed, using sample data:', err);
        // Fallback to sample data when API fails
        allItems = [...sampleGames];
        originalItems = [...sampleGames];
        currentPage = 1;
        renderTablePage(currentPage);
        
        const endTime = new Date();
        const durationMs = endTime - startTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        const timingInfo = document.getElementById('timingInfo');
        timingInfo.textContent = `Start: ${startTime.toLocaleTimeString()} | End: ${endTime.toLocaleTimeString()} | Total: ${minutes}m ${seconds}s | Records: ${originalItems.length} (sample data) | Pages: ${Math.ceil(originalItems.length / itemsPerPage)}`;
    }
});


// Pagination and table rendering
let allItems = [];
let currentPage = 1;
const itemsPerPage = 100;

function renderTablePage(page) {
    // Show filtered/total counts in timingInfo (always show both)
        // Enhanced timing/filter info presentation (top right)
    // Only show API timing and original record count in the top right, never filtered counts
    const timingInfo = document.getElementById('timingInfo');
    if (timingInfo && typeof originalItems !== 'undefined') {
        // Extract start/end/total from previous info if present
        let start = '', end = '', total = '';
        const prev = timingInfo.textContent;
        const startMatch = prev.match(/Start: ([^>|]+)/);
        const endMatch = prev.match(/End: ([^=|]+)/);
        const totalMatch = prev.match(/Total: ([^=|<]+)/);
        if (startMatch) start = startMatch[1].trim();
        if (endMatch) end = endMatch[1].trim();
        if (totalMatch) total = totalMatch[1].trim();
        const totalRecords = originalItems.length;
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        // Compose info block (top right) in requested multiline format
        let infoHtml = '<div class="timing-summary-topright" style="text-align:right;line-height:1.5;">';
        if (start && end && total) {
            infoHtml += `<div>Start: <b>${start}</b> &gt; End: <b>${end}</b> = <b>${total}</b></div>`;
        }
        infoHtml += `<div>Total Pages: <b>${totalPages}</b></div>`;
        infoHtml += `<div>Total Records: <b>${totalRecords}</b></div>`;
        infoHtml += '</div>';
        timingInfo.innerHTML = infoHtml;
    }

        // Prepare filter summary for above and below table
        let filterSummary = '';
        // Player count filter
        const selectedPlayerCounts = Array.from(document.querySelectorAll('.playerCountBox:checked')).map(cb => cb.value);
        if (selectedPlayerCounts.length) {
            filterSummary += `<span class="active-filter">Players: ${selectedPlayerCounts.join(', ')}</span> `;
        }
        // Button filters (detect by button text or state)
        const filterButtons = [
            {id: 'quickGamesBtn', label: 'Quick Games'},
            {id: 'newestGamesBtn', label: 'New Games'},
            {id: 'mostPlayedBtn', label: 'Most Played Games'},
            {id: 'ratingSortBtn', label: 'Best Rating'},
            {id: 'wantToPlayBtn', label: 'Want to Play (by Rating)'},
            {id: 'wantToBuyBtn', label: 'Want to Buy Games'}
        ];
        let lastActiveBtn = '';
        filterButtons.forEach(btn => {
            const el = document.getElementById(btn.id);
            if (el && el.classList.contains('active-filter-btn')) {
                lastActiveBtn = btn.label;
            }
        });
        // Compose filter info for above and below table
        let filterInfoHtml = '';
        if (filterSummary || lastActiveBtn) {
            filterInfoHtml += '<div class="pagination-filters" style="margin-bottom:0.3em; text-align:center;">';
            if (filterSummary) filterInfoHtml += filterSummary;
            if (lastActiveBtn) filterInfoHtml += `<span class="active-filter">${lastActiveBtn}</span>`;
            filterInfoHtml += '</div>';
        }
    let html = '';
    // Download buttons are now in the Collection Actions area (index.html)
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    // Player count and status flag filters are now rendered in the Main Filter Buttons container (index.html)
    // Preset Views dropdown is now only in the View & Search Options area (index.html)
    // Add event handler for Prev Owned (prevowned>0, sort by bayesaverage desc)
    // Preset Views dropdown event handler
    setTimeout(() => {
        const presetDropdown = document.getElementById('presetViewsDropdown');
        if (presetDropdown) {
            presetDropdown.onchange = function() {
                const val = this.value;
                if (!val || val === '') return;
                if (val === 'all') {
                    allItems = [...originalItems];
                } else if (val === 'quick') {
                    allItems = originalItems.filter(item => Number(item.own) > 0)
                        .sort((a, b) => Number(a.playingtime) - Number(b.playingtime));
                } else if (val === 'newest') {
                    allItems = originalItems.filter(item => Number(item.own) > 0)
                        .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
                } else if (val === 'mostPlayed') {
                    allItems = originalItems.filter(item => Number(item.own) > 0)
                        .sort((a, b) => Number(b.numplays) - Number(a.numplays));
                } else if (val === 'bestRating') {
                    allItems = originalItems.filter(item => Number(item.own) > 0)
                        .sort((a, b) => Number(b.bayesaverage) - Number(a.bayesaverage));
                } else if (val === 'wantToPlay') {
                    allItems = originalItems.filter(item => /wanttoplay=1/.test(item.statusStr || ''))
                        .map(item => {
                            let customScore = 0;
                            const status = item.statusStr || '';
                            const wantToPlay = /wanttoplay=1/.test(status);
                            const wishlist = /wishlist=1/.test(status);
                            let wishlistPriority = 0;
                            const match = status.match(/wishlistpriority=(\d+)/);
                            if (match) wishlistPriority = parseInt(match[1], 10);
                            if (wantToPlay) {
                                if (wishlist) {
                                    let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                                    customScore = 5 + inverted;
                                } else {
                                    customScore = 5;
                                }
                            }
                            return { ...item, _customScore: customScore };
                        })
                        .sort((a, b) => b._customScore - a._customScore);
                } else if (val === 'wantToBuy') {
                    allItems = originalItems.filter(item => /wanttobuy=1/.test(item.statusStr || ''))
                        .map(item => {
                            let customBuyScore = 0;
                            const status = item.statusStr || '';
                            const wantToBuy = /wanttobuy=1/.test(status);
                            const wishlist = /wishlist=1/.test(status);
                            let wishlistPriority = 0;
                            const match = status.match(/wishlistpriority=(\d+)/);
                            if (match) wishlistPriority = parseInt(match[1], 10);
                            if (wantToBuy) {
                                if (wishlist) {
                                    let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                                    customBuyScore = 5 + inverted;
                                } else {
                                    customBuyScore = 5;
                                }
                            }
                            return { ...item, _customBuyScore: customBuyScore };
                        })
                        .sort((a, b) => b._customBuyScore - a._customBuyScore);
                } else if (val === 'prevOwned') {
                    allItems = originalItems.filter(item => Number(item.prevowned) > 0)
                        .sort((a, b) => Number(b.bayesaverage) - Number(a.bayesaverage));
                }
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
    }, 0);
    // Add event handler for Want to Play (wanttoplay=1, order by bayesaverage desc)
    setTimeout(() => {
        const wantToPlayBtn = document.getElementById('wantToPlayBtn');
        if (wantToPlayBtn) {
            wantToPlayBtn.onclick = () => {
                allItems = originalItems.filter(item => /wanttoplay=1/.test(item.statusStr || ''))
                    .map(item => {
                        let customScore = 0;
                        const status = item.statusStr || '';
                        const wantToPlay = /wanttoplay=1/.test(status);
                        const wishlist = /wishlist=1/.test(status);
                        let wishlistPriority = 0;
                        const match = status.match(/wishlistpriority=(\d+)/);
                        if (match) wishlistPriority = parseInt(match[1], 10);
                        if (wantToPlay) {
                            if (wishlist) {
                                let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                                customScore = 5 + inverted;
                            } else {
                                customScore = 5;
                            }
                        }
                        return { ...item, _customScore: customScore };
                    })
                    .sort((a, b) => b._customScore - a._customScore);
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
    }, 0);
    // Add event handler for Want to Buy Games (wanttobuy=1, order by custom buy score desc)
    setTimeout(() => {
        const wantToBuyBtn = document.getElementById('wantToBuyBtn');
        if (wantToBuyBtn) {
            wantToBuyBtn.onclick = () => {
                allItems = originalItems.filter(item => /wanttobuy=1/.test(item.statusStr || ''))
                    .map(item => {
                        let customBuyScore = 0;
                        const status = item.statusStr || '';
                        const wantToBuy = /wanttobuy=1/.test(status);
                        const wishlist = /wishlist=1/.test(status);
                        let wishlistPriority = 0;
                        const match = status.match(/wishlistpriority=(\d+)/);
                        if (match) wishlistPriority = parseInt(match[1], 10);
                        if (wantToBuy) {
                            if (wishlist) {
                                let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                                customBuyScore = 5 + inverted;
                            } else {
                                customBuyScore = 5;
                            }
                        }
                        return { ...item, _customBuyScore: customBuyScore };
                    })
                    .sort((a, b) => b._customBuyScore - a._customBuyScore);
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
    }, 0);
    // Add event handler for Sort by Bayes Avg (desc, only owned)
    setTimeout(() => {
        const ratingBtn = document.getElementById('ratingSortBtn');
        if (ratingBtn) {
            ratingBtn.onclick = () => {
                console.log('[Sort by Bayes Avg] Button clicked');
                if (ratingBtn.textContent.includes('Show All')) {
                    allItems = [...originalItems];
                    ratingBtn.textContent = 'Sort by Bayes Avg (desc)';
                    console.log('[Sort by Bayes Avg] Restored allItems:', allItems);
                } else {
                    allItems = originalItems.filter(item => Number(item.own) > 0)
                        .sort((a, b) => Number(b.bayesaverage) - Number(a.bayesaverage));
                    ratingBtn.textContent = 'Show All';
                    console.log('[Sort by Bayes Avg] Filtered/Sorted allItems:', allItems.map(g => ({name: g.name, bayesaverage: g.bayesaverage, own: g.own})));
                }
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
    }, 0);
    // Add event handler for player count filter (checkboxes)
    setTimeout(() => {
        const applyBtn = document.getElementById('applyPlayerFilterBtn');
        const clearBtn = document.getElementById('clearPlayerFilterBtn');
        const checkboxes = document.querySelectorAll('.playerCountBox');
        const selectedDisplay = document.getElementById('selectedPlayerCounts');
        function getSelected() {
            return Array.from(checkboxes).filter(cb => cb.checked).map(cb => Number(cb.value));
        }
        if (applyBtn && checkboxes.length) {
            applyBtn.onclick = () => {
                const selected = getSelected();
                if (selected.length === 0) {
                    // Don't reset to all items, just remove player count filter
                    if (selectedDisplay) selectedDisplay.textContent = '';
                    renderTablePage(1);
                    return;
                }
                // Apply player count filter on top of current allItems (not originalItems)
                allItems = allItems.filter(item => {
                    const minp = Number(item.minplayers) || 0;
                    const maxp = Number(item.maxplayers) || 0;
                    return selected.some(sel => sel >= minp && sel <= maxp);
                });
                // Show filtered player count numbers
                if (selectedDisplay) selectedDisplay.textContent = `Selected: ${selected.join(', ')} | Filtered: ${allItems.length} | Pages: ${Math.ceil(allItems.length / itemsPerPage)}`;
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
        if (clearBtn && checkboxes.length) {
            clearBtn.onclick = () => {
                checkboxes.forEach(cb => cb.checked = false);
                if (selectedDisplay) selectedDisplay.textContent = '';
                renderTablePage(1);
            };
        }
    }, 0);

    // Add event handler for status flag filter (checkboxes and number input)
    setTimeout(() => {
        const applyStatusBtn = document.getElementById('applyStatusFlagBtn');
        const clearStatusBtn = document.getElementById('clearStatusFlagBtn');
        const flagBoxes = document.querySelectorAll('.statusFlagBox');
        const flagInputs = document.querySelectorAll('.statusFlagInput');
        const selectedStatusDisplay = document.getElementById('selectedStatusFlags');
        if (applyStatusBtn) {
            applyStatusBtn.onclick = () => {
                // Start from current allItems (not originalItems)
                let filtered = allItems;
                let summary = [];
                flagBoxes.forEach(cb => {
                    if (cb.checked) {
                        const flag = cb.getAttribute('data-flag');
                        filtered = filtered.filter(item => {
                            // statusStr: own=1<br>prevowned=0... etc
                            const match = (item.statusStr || '').match(new RegExp(flag + '=(\\d+)'));
                            return match && Number(match[1]) > 0;
                        });
                        summary.push(flag + '>0');
                    }
                });
                flagInputs.forEach(input => {
                    const val = input.value.trim();
                    if (val !== '') {
                        const flag = input.getAttribute('data-flag');
                        filtered = filtered.filter(item => {
                            const match = (item.statusStr || '').match(new RegExp(flag + '=(\\d+)'));
                            return match && Number(match[1]) === Number(val);
                        });
                        summary.push(flag + '=' + val);
                    }
                });
                allItems = filtered;
                if (selectedStatusDisplay) selectedStatusDisplay.textContent = summary.length ? `Filtered: ${summary.join(', ')} | Records: ${allItems.length}` : '';
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
        if (clearStatusBtn) {
            clearStatusBtn.onclick = () => {
                flagBoxes.forEach(cb => cb.checked = false);
                flagInputs.forEach(input => input.value = '');
                if (selectedStatusDisplay) selectedStatusDisplay.textContent = '';
                renderTablePage(1);
            };
        }
    }, 0);
    // Add event handler for Most Played Games (owned, sort by numplays desc)
    setTimeout(() => {
        const mostPlayedBtn = document.getElementById('mostPlayedBtn');
        if (mostPlayedBtn) {
            mostPlayedBtn.onclick = () => {
                console.log('[Most Played Games] Button clicked');
                if (mostPlayedBtn.textContent.includes('Show All')) {
                    allItems = [...originalItems];
                    mostPlayedBtn.textContent = 'Most Played Games';
                    console.log('[Most Played Games] Restored allItems:', allItems);
                } else {
                    allItems = originalItems.filter(item => Number(item.own) > 0)
                        .sort((a, b) => Number(b.numplays) - Number(a.numplays));
                    mostPlayedBtn.textContent = 'Show All';
                    console.log('[Most Played Games] Filtered/Sorted allItems:', allItems.map(g => ({name: g.name, numplays: g.numplays, own: g.own})));
                }
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
    }, 0);
    
    // Add event handler for Want to Buy Games (sorted by bayesaverage desc)
    setTimeout(() => {
        const wantToBuyBtn = document.getElementById('wantToBuyBtn');
        if (wantToBuyBtn) {
            wantToBuyBtn.onclick = () => {
                console.log('[Want to Buy Games] Button clicked');
                if (wantToBuyBtn.textContent.includes('Show All')) {
                    allItems = [...originalItems];
                    wantToBuyBtn.textContent = 'Want to Buy Games';
                    console.log('[Want to Buy Games] Restored allItems:', allItems);
                } else {
                    // Filter games that are marked as want to buy and sort by bayesaverage desc
                    allItems = originalItems.filter(item => {
                        // Check both want and wanttobuy status from statusStr
                        const statusStr = item.statusStr || '';
                        return statusStr.includes('want=1') || statusStr.includes('wanttobuy=1');
                    }).sort((a, b) => Number(b.bayesaverage) - Number(a.bayesaverage));
                    wantToBuyBtn.textContent = 'Show All';
                    console.log('[Want to Buy Games] Filtered/Sorted allItems:', allItems.map(g => ({name: g.name, bayesaverage: g.bayesaverage, statusStr: g.statusStr})));
                }
                currentPage = 1;
                renderTablePage(currentPage);
            };
        }
    }, 0);
    // Remove legacy pagination controls (top). Only use new pagination with jump-to-page input.
    if (allItems.length > 0) {
        html += `<style>
            .bgg-table thead th {
                position: sticky;
                top: 0;
                background: #f8f8f8;
                z-index: 2;
            }
            .bgg-table {
                border-collapse: collapse;
                min-width: 1800px;
            }
            .pagination-btn {
                background: #0078d4;
                color: #fff;
                border: none;
                border-radius: 4px;
                padding: 0.4em 1.2em;
                margin: 0 0.3em;
                font-size: 1em;
                cursor: pointer;
                transition: background 0.2s;
            }
            .pagination-btn:disabled {
                background: #b0b0b0;
                color: #f0f0f0;
                cursor: not-allowed;
            }
            .pagination-input {
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 0.2em 0.5em;
                font-size: 1em;
                width: 3em;
                margin: 0 0.2em;
                text-align: center;
            }
        </style>`;
        html += `<div style="overflow-x:auto; max-height:600px;">
        <table class="bgg-table" border="1" cellpadding="4" cellspacing="0">
            <thead><tr>`;
        // Determine if 'newest' preset is active
        const presetDropdown = document.getElementById('presetViewsDropdown');
    const isNewestPreset = presetDropdown && presetDropdown.value === 'newest';
    const isQuickPreset = presetDropdown && presetDropdown.value === 'quick';
    const isMostPlayedPreset = presetDropdown && presetDropdown.value === 'mostPlayed';
        if (simpleView) {
            html += `<th>#</th><th>Image</th><th>Name</th>`;
            if (isNewestPreset) html += `<th style="color:#0078d4;">Year Published</th>`;
            if (isQuickPreset) html += `<th style="color:#28a745;">Time to Play</th>`;
            if (isMostPlayedPreset) html += `<th style="color:#ff9800;">Number of Plays</th>`;
            const isWantToPlayPreset = presetDropdown && presetDropdown.value === 'wantToPlay';
            const isWantToBuyPreset = presetDropdown && presetDropdown.value === 'wantToBuy';
            if (isWantToPlayPreset) html += `<th style="color:#6f42c1;">Custom Play Number</th>`;
            if (isWantToBuyPreset) html += `<th style="color:#c62828;">Custom Buy Number</th>`;
        } else {
            html += `<th>#</th>
                <th>Thumbnail</th>
                <th>Name</th>
                <th>Year</th>
                <th>Type</th>
                <th>Subtype</th>
                <th>CollID</th>
                <th>Status</th>
                <th>Last Modified</th>
                <th>Num Plays</th>
                <th>Image</th>
                <th>Min Players</th>
                <th>Max Players</th>
                <th>Min Playtime</th>
                <th>Max Playtime</th>
                <th>Playing Time</th>
                <th>Num Owned</th>
                <th>Rating</th>
                <th>Users Rated</th>
                <th>Average</th>
                <th>Bayes Avg</th>
                <th>Std Dev</th>
                <th>Median</th>
                <th>Ranks</th>
                <th>Custom Score</th>
                <th>Custom Buy Score</th>
                <th>Link</th>`;
        }
        html += `</tr></thead><tbody>`;
        for (let i = startIdx; i < endIdx; i++) {
            const item = allItems[i];
            if (simpleView) {
                html += `<tr>
                    <td>${i + 1}</td>
                    <td><img src="${item.thumbnail}" alt="thumbnail" style="max-width:60px;max-height:45px;"></td>
                    <td><a href="https://boardgamegeek.com/boardgame/${item.objectid}" target="_blank" rel="noopener" style="color:#007bff;text-decoration:underline;">${item.name}</a></td>`;
                if (isNewestPreset) html += `<td style="color:#0078d4; font-weight:bold;">${item.yearpublished}</td>`;
                if (isQuickPreset) html += `<td style="color:#28a745; font-weight:bold;">${item.playingtime}</td>`;
                if (isMostPlayedPreset) html += `<td style="color:#ff9800; font-weight:bold;">${item.numplays}</td>`;
                const isWantToPlayPreset = presetDropdown && presetDropdown.value === 'wantToPlay';
                const isWantToBuyPreset = presetDropdown && presetDropdown.value === 'wantToBuy';
                if (isWantToPlayPreset) {
                    // Custom Play Number logic (same as main table)
                    let customScore = 0;
                    const status = item.statusStr || '';
                    const wantToPlay = /wanttoplay=1/.test(status);
                    const wishlist = /wishlist=1/.test(status);
                    let wishlistPriority = 0;
                    const match = status.match(/wishlistpriority=(\d+)/);
                    if (match) wishlistPriority = parseInt(match[1], 10);
                    if (wantToPlay) {
                        if (wishlist) {
                            let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                            customScore = 5 + inverted;
                        } else {
                            customScore = 5;
                        }
                    }
                    html += `<td style="color:#6f42c1; font-weight:bold;">${customScore}</td>`;
                }
                if (isWantToBuyPreset) {
                    // Custom Buy Number logic (same as main table)
                    let customBuyScore = 0;
                    const status = item.statusStr || '';
                    const wantToBuy = /wanttobuy=1/.test(status);
                    const wishlist = /wishlist=1/.test(status);
                    let wishlistPriority = 0;
                    const match = status.match(/wishlistpriority=(\d+)/);
                    if (match) wishlistPriority = parseInt(match[1], 10);
                    if (wantToBuy) {
                        if (wishlist) {
                            let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                            customBuyScore = 5 + inverted;
                        } else {
                            customBuyScore = 5;
                        }
                    }
                    html += `<td style="color:#c62828; font-weight:bold;">${customBuyScore}</td>`;
                }
                html += `</tr>`;
            } else {
                // Custom Score calculation
                let customScore = 0;
                let customBuyScore = 0;
                const status = item.statusStr || '';
                const wantToPlay = /wanttoplay=1/.test(status);
                const wantToBuy = /wanttobuy=1/.test(status);
                const wishlist = /wishlist=1/.test(status);
                let wishlistPriority = 0;
                const match = status.match(/wishlistpriority=(\d+)/);
                if (match) wishlistPriority = parseInt(match[1], 10);
                if (wantToPlay) {
                    if (wishlist) {
                        let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                        customScore = 5 + inverted;
                    } else {
                        customScore = 5;
                    }
                }
                if (wantToBuy) {
                    if (wishlist) {
                        let inverted = 6 - Math.max(1, Math.min(wishlistPriority, 5));
                        customBuyScore = 5 + inverted;
                    } else {
                        customBuyScore = 5;
                    }
                }
                html += `<tr>
                    <td>${i + 1}</td>
                    <td><img src="${item.thumbnail}" alt="thumbnail" style="max-width:60px;max-height:45px;"></td>
                    <td><a href="https://boardgamegeek.com/boardgame/${item.objectid}" target="_blank" rel="noopener" style="color:#007bff;text-decoration:underline;">${item.name}</a></td>
                    <td>${item.yearpublished}</td>
                    <td>${item.objecttype}</td>
                    <td>${item.subtype}</td>
                    <td>${item.collid}</td>
                    <td>${item.statusStr}</td>
                    <td>${item.lastmodified || ''}</td>
                    <td>${item.numplays}</td>
                    <td>${item.image ? `<img src="${item.image}" alt="image" style="max-width:120px;max-height:90px;">` : ''}</td>
                    <td>${item.minplayers}</td>
                    <td>${item.maxplayers}</td>
                    <td>${item.minplaytime}</td>
                    <td>${item.maxplaytime}</td>
                    <td>${item.playingtime}</td>
                    <td>${item.numowned}</td>
                    <td>${item.ratingValue}</td>
                    <td>${item.usersrated}</td>
                    <td>${item.average}</td>
                    <td>${item.bayesaverage}</td>
                    <td>${item.stddev}</td>
                    <td>${item.median}</td>
                    <td>${item.ranksStr}</td>
                    <td>${customScore}</td>
                    <td>${customBuyScore}</td>
                    <td><a href="https://boardgamegeek.com/boardgame/${item.objectid}" target="_blank">View</a></td>
                </tr>`;
            }
        }
        html += '</tbody></table></div>';
    // Show filters above table and pagination with jump-to-page input (top)
    html = filterInfoHtml + getPaginationHtml('top') + html;
    // Pagination controls (bottom) with jump-to-page input
    html += filterInfoHtml + getPaginationHtml('bottom');
// Helper to render pagination controls with jump-to-page input
function getPaginationHtml(position) {
    const totalPages = Math.ceil(allItems.length / itemsPerPage) || 1;
    const page = currentPage;
    return `<div class="pagination-controls" data-pos="${position}" style="margin:1em 0; text-align:center;">
        <button id="prevPage${position}" class="modern-btn pagination-btn" ${page === 1 ? 'disabled' : ''}>Prev</button>
        Page <input id="jumpPageInput${position}" type="number" min="1" max="${totalPages}" value="${page}" class="pagination-input" style="width:3em; text-align:center;"> of ${totalPages}
        <span class="filtered-count">Filtered: <b>${allItems.length}</b></span>
        <button id="nextPage${position}" class="modern-btn pagination-btn" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>`;
}
    }
    document.getElementById('results').innerHTML = html || 'No games found.';
    // Download CSV handler
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    if (downloadCsvBtn) {
        downloadCsvBtn.onclick = function() {
            const csv = convertGamesToCsv(allItems);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bgg_collection.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
    }
    // Download XLSX handler (requires SheetJS if available)
    const downloadXlsxBtn = document.getElementById('downloadXlsxBtn');
    if (downloadXlsxBtn) {
        downloadXlsxBtn.onclick = function() {
            if (typeof XLSX !== 'undefined') {
                const ws = XLSX.utils.json_to_sheet(allItems);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Collection');
                XLSX.writeFile(wb, 'bgg_collection.xlsx');
            } else {
                alert('XLSX export requires SheetJS (XLSX) library. Downloading CSV instead.');
                if (downloadCsvBtn) downloadCsvBtn.click();
            }
        };
    }
    // Add event handlers for pagination buttons and jump inputs (top and bottom)
// Convert current view to CSV string
function convertGamesToCsv(items) {
    if (!items || !items.length) return '';
    // Use the keys of the first item as columns
    const columns = Object.keys(items[0]);
    const escape = v => '"' + String(v).replace(/"/g, '""') + '"';
    const header = columns.map(escape).join(',');
    const rows = items.map(item => columns.map(col => escape(item[col] ?? '')).join(','));
    return [header, ...rows].join('\r\n');
}
    if (allItems.length > 0) {
        ['top', 'bottom'].forEach(pos => {
            const prevBtn = document.getElementById(`prevPage${pos}`);
            const nextBtn = document.getElementById(`nextPage${pos}`);
            const jumpInput = document.getElementById(`jumpPageInput${pos}`);
            if (prevBtn) prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderTablePage(currentPage); } };
            if (nextBtn) nextBtn.onclick = () => { if (currentPage < Math.ceil(allItems.length / itemsPerPage)) { currentPage++; renderTablePage(currentPage); } };
            if (jumpInput) jumpInput.onchange = (e) => {
                let val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= Math.ceil(allItems.length / itemsPerPage)) {
                    currentPage = val;
                    renderTablePage(currentPage);
                } else {
                    e.target.value = currentPage;
                }
            };
        });
    }
    // Add event handler for Quick Games (owned, sort by playing time asc)
    const quickBtn = document.getElementById('quickGamesBtn');
    if (quickBtn) {
        quickBtn.onclick = () => {
            console.log('[Quick Games] Button clicked');
            if (quickBtn.textContent.includes('Show All')) {
                allItems = [...originalItems];
                quickBtn.textContent = 'Quick Games sort by asc value';
                console.log('[Quick Games] Restored allItems:', allItems);
            } else {
                allItems = originalItems.filter(item => Number(item.own) > 0)
                    .sort((a, b) => Number(a.playingtime) - Number(b.playingtime));
                quickBtn.textContent = 'Show All';
                console.log('[Quick Games] Filtered/Sorted allItems:', allItems.map(g => ({name: g.name, playingtime: g.playingtime, own: g.own})));
            }
            currentPage = 1;
            renderTablePage(currentPage);
        };
    }
    // Add event handler for Newest Released Games (owned, sort by year desc)
    const newestBtn = document.getElementById('newestGamesBtn');
    if (newestBtn) {
        newestBtn.onclick = () => {
            console.log('[Newest Released Games] Button clicked');
            if (newestBtn.textContent.includes('Show All')) {
                allItems = [...originalItems];
                newestBtn.textContent = 'Newest Released Games';
                console.log('[Newest Released Games] Restored allItems:', allItems);
            } else {
                allItems = originalItems.filter(item => Number(item.own) > 0)
                    .sort((a, b) => {
                        const ya = Number(a.year) || 0;
                        const yb = Number(b.year) || 0;
                        return yb - ya;
                    });
                newestBtn.textContent = 'Show All';
                console.log('[Newest Released Games] Filtered/Sorted allItems:', allItems.map(g => ({name: g.name, year: g.year, yearpublished: g.yearpublished, own: g.own})));
            }
            currentPage = 1;
            renderTablePage(currentPage);
        };
    }

}

// Real-time search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    let searchTimeout;
    
    // Real-time search as user types
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Debounce the search to avoid excessive filtering
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(this.value.trim());
            }, 300);
        });
    }
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            performSearch('');
        });
    }
    
    function performSearch(searchTerm) {
        console.log('[Search] Searching for:', searchTerm);
        
        if (searchTerm === '') {
            // If search is empty, restore original items
            allItems = [...originalItems];
        } else {
            // Filter items by name (case-insensitive)
            allItems = originalItems.filter(item => {
                return item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }
        
        console.log('[Search] Filtered items count:', allItems.length);
        currentPage = 1;
        
        // Re-render the current page if results exist
        if (typeof renderTablePage === 'function') {
            renderTablePage(currentPage);
        }
    }
});