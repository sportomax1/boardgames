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
    timingInfo.textContent = `Start: ${startTime.toLocaleTimeString()} | End: ${endTime.toLocaleTimeString()} | Total: ${minutes}m ${seconds}s | Records: ${allItems.length} | Pages: ${totalPages}`;
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
    let html = '';
    const startIdx = (page - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, allItems.length);
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
        // Filter/sort buttons (top)
        html += `<div style="margin:1em 0; text-align:center;">
            <button id="quickGamesBtn">Quick Games sort by asc value</button>
            <button id="newestGamesBtn">Newest Released Games</button>
            <button id="mostPlayedBtn">Most Played Games</button>
        </div>`;
    // Add event handler for Most Played Games (owned, sort by numplays desc)
    const mostPlayedBtn = document.getElementById('mostPlayedBtn');
    if (mostPlayedBtn) {
        mostPlayedBtn.onclick = () => {
            if (mostPlayedBtn.textContent.includes('Show All')) {
                allItems = [...originalItems];
                mostPlayedBtn.textContent = 'Most Played Games';
            } else {
                allItems = originalItems.filter(item => Number(item.own) > 0)
                    .sort((a, b) => Number(b.numplays) - Number(a.numplays));
                mostPlayedBtn.textContent = 'Show All';
            }
            currentPage = 1;
            renderTablePage(currentPage);
        };
    }
    // Pagination controls (top)
    if (allItems.length > 0) {
        html += `<div style="margin:1em 0; text-align:center;">
            <button id="prevPageTop" ${page === 1 ? 'disabled' : ''}>Prev</button>
            Page ${page} of ${totalPages}
            <button id="nextPageTop" ${endIdx >= allItems.length ? 'disabled' : ''}>Next</button>
        </div>`;
        html += `<div style="overflow-x:auto;"><table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse; min-width:1800px;">
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
            if (quickBtn.textContent.includes('Show All')) {
                allItems = [...originalItems];
                quickBtn.textContent = 'Quick Games sort by asc value';
            } else {
                allItems = originalItems.filter(item => Number(item.own) > 0)
                    .sort((a, b) => Number(a.playingtime) - Number(b.playingtime));
                quickBtn.textContent = 'Show All';
            }
            currentPage = 1;
            renderTablePage(currentPage);
        };
    }
    // Add event handler for Newest Released Games (owned, sort by year desc)
    const newestBtn = document.getElementById('newestGamesBtn');
    if (newestBtn) {
        newestBtn.onclick = () => {
            if (newestBtn.textContent.includes('Show All')) {
                allItems = [...originalItems];
                newestBtn.textContent = 'Newest Released Games';
            } else {
                allItems = originalItems.filter(item => Number(item.own) > 0)
                    .sort((a, b) => b.year - a.year);
                newestBtn.textContent = 'Show All';
            }
            currentPage = 1;
            renderTablePage(currentPage);
        };
    }

}