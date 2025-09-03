// Store the unfiltered list for toggling
let originalItems = [];
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
                objecttype, objectid, subtype, collid, name, yearpublished: yearpublishedStr, year, image, thumbnail, statusStr, lastmodified, numplays, minplayers, maxplayers, minplaytime, maxplaytime, playingtime, numowned, ratingValue, usersrated, average, bayesaverage, stddev, median, ranksStr, own
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
        document.getElementById('results').innerHTML = 'Error fetching data.';
        const endTime = new Date();
        const durationMs = endTime - startTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        timingInfo.textContent = `Start: ${startTime.toLocaleTimeString()} | End: ${endTime.toLocaleTimeString()} | Total: ${minutes}m ${seconds}s`;
    }
});


// Pagination and table rendering
let allItems = [];
let currentPage = 1;
const itemsPerPage = 100;

function renderTablePage(page) {
    // Show filtered/total counts in timingInfo (always show both)
    const timingInfo = document.getElementById('timingInfo');
    if (timingInfo && typeof originalItems !== 'undefined') {
        const totalRecords = originalItems.length;
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        const filteredRecords = allItems.length;
        const filteredPages = Math.ceil(filteredRecords / itemsPerPage);
        // Try to preserve the start/end/time info if present
        const base = timingInfo.textContent.split('| Records:')[0];
        timingInfo.textContent = `${base}| Records: ${totalRecords} | Pages: ${totalPages} | Filtered: ${filteredRecords} | Filtered Pages: ${filteredPages}`;
    }
    let html = '';
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
        // Player count filter (top) as checkboxes
        const playerOptions = Array.from({length: 12}, (_, i) => i + 1); // 1-12 players
        html += `<div style="margin:1em 0; text-align:center;">
            <span>Filter by player count:</span>
            <span id="playerCountCheckboxes">
                ${playerOptions.map(n => `<label style='margin:0 4px;'><input type='checkbox' value='${n}' class='playerCountBox'/>${n}</label>`).join('')}
            </span>
            <button id="applyPlayerFilterBtn">Apply</button>
            <button id="clearPlayerFilterBtn">Clear</button>
            <span id="selectedPlayerCounts" style="margin-left:1em;color:#0078d4;"></span>
        </div>`;
        // Filter/sort buttons (top)
        html += `<div style="margin:1em 0; text-align:center;">
            <button id="quickGamesBtn">Quick Games sort by asc value</button>
            <button id="newestGamesBtn">Newest Released Games</button>
            <button id="mostPlayedBtn">Most Played Games</button>
            <button id="ratingSortBtn">Sort by Bayes Avg (desc)</button>
        </div>`;
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
                // Remove only the player count filter, keep other filters/sorts
                // Re-render with the last non-player-count filtered set
                // To do this, refetch the base set from the last filter/sort (not originalItems)
                // We'll just trigger a re-render, which will use the current allItems
                if (selectedDisplay) selectedDisplay.textContent = '';
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
    // Pagination controls (top)
    if (allItems.length > 0) {
        html += `<div style="margin:1em 0; text-align:center;">
            <button id="prevPageTop" ${page === 1 ? 'disabled' : ''}>Prev</button>
            Page ${page} of ${totalPages}
            <button id="nextPageTop" ${endIdx >= allItems.length ? 'disabled' : ''}>Next</button>
        </div>`;
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
        </style>`;
        html += `<div style="overflow-x:auto; max-height:600px;">
        <table class="bgg-table" border="1" cellpadding="4" cellspacing="0">
            <thead><tr>
                <th>#</th>
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
                <th>Link</th>
            </tr></thead><tbody>`;
        for (let i = startIdx; i < endIdx; i++) {
            const item = allItems[i];
            html += `<tr>
                <td>${i + 1}</td>
                <td><img src="${item.thumbnail}" alt="thumbnail" style="max-width:60px;max-height:45px;"></td>
                <td>${item.name}</td>
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
                <td><a href="https://boardgamegeek.com/boardgame/${item.objectid}" target="_blank">View</a></td>
            </tr>`;
        }
        html += '</tbody></table></div>';
        // Pagination controls (bottom)
        html += `<div style="margin:1em 0; text-align:center;">
            <button id="prevPage" ${page === 1 ? 'disabled' : ''}>Prev</button>
            Page ${page} of ${totalPages}
            <button id="nextPage" ${endIdx >= allItems.length ? 'disabled' : ''}>Next</button>
        </div>`;
    }
    document.getElementById('results').innerHTML = html || 'No games found.';
    // Add event handlers for pagination buttons if present
    if (allItems.length > 0) {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const prevBtnTop = document.getElementById('prevPageTop');
        const nextBtnTop = document.getElementById('nextPageTop');
        if (prevBtn) prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderTablePage(currentPage); } };
        if (nextBtn) nextBtn.onclick = () => { if ((currentPage * itemsPerPage) < allItems.length) { currentPage++; renderTablePage(currentPage); } };
        if (prevBtnTop) prevBtnTop.onclick = () => { if (currentPage > 1) { currentPage--; renderTablePage(currentPage); } };
        if (nextBtnTop) nextBtnTop.onclick = () => { if ((currentPage * itemsPerPage) < allItems.length) { currentPage++; renderTablePage(currentPage); } };
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