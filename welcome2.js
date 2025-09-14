console.log('Welcome2 page loaded! (script start)');

document.addEventListener('DOMContentLoaded', function() {
    // Share button logic
    const shareBtn = document.getElementById('shareBtn');
    const shareDropdown = document.getElementById('shareDropdown');
    const downloadTableBtn = document.getElementById('downloadTableBtn');
    const copyTableBtn = document.getElementById('copyTableBtn');
    // Toggle dropdown
    if (shareBtn && shareDropdown) {
        shareBtn.onclick = (e) => {
            e.stopPropagation();
            shareDropdown.style.display = shareDropdown.style.display === 'block' ? 'none' : 'block';
        };
        document.addEventListener('click', (e) => {
            if (shareDropdown.style.display === 'block') shareDropdown.style.display = 'none';
        });
    }
    // Download table as CSV
    if (downloadTableBtn) {
        downloadTableBtn.onclick = () => {
            if (!window.lastRecords || !window.lastDisplayFields) return;
            const arr = window.lastRecords;
            const fields = window.lastDisplayFields;
            let csv = fields.join(',') + '\n';
            arr.forEach(row => {
                csv += fields.map(f => '"' + (row[f] ? ('' + row[f]).replace(/"/g, '""') : '') + '"').join(',') + '\n';
            });
            const blob = new Blob([csv], {type: 'text/csv'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'table.csv';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        };
    }
    // Copy table to clipboard
    if (copyTableBtn) {
        copyTableBtn.onclick = async () => {
            if (!window.lastRecords || !window.lastDisplayFields) return;
            const arr = window.lastRecords;
            const fields = window.lastDisplayFields;
            let tsv = fields.join('\t') + '\n';
            arr.forEach(row => {
                tsv += fields.map(f => row[f] ? ('' + row[f]).replace(/\t/g, ' ') : '').join('\t') + '\n';
            });
            try {
                await navigator.clipboard.writeText(tsv);
                alert('Table copied to clipboard!');
            } catch (e) {
                alert('Failed to copy table.');
            }
        };
    }
    // Pagination state
    let currentPage = 1;
    let totalPages = 1;
    let pageSize = 100;
    let lastFilteredArr = [];
    const paginationTop = document.getElementById('paginationTop');
    const paginationBottom = document.getElementById('paginationBottom');
    const searchNameOnly = document.getElementById('searchNameOnly');
    // Helper to render the table from records and fields
    function renderTable(records, fields, displayFields) {
        // Pagination logic
        totalPages = Math.max(1, Math.ceil(records.length / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pagedRecords = records.slice(startIdx, endIdx);
        let html = `<div style='overflow-x:auto;'><table border='1' cellpadding='6' style='border-collapse:collapse; margin:auto; background:#fff; min-width:1200px;'><thead><tr>`;
        displayFields.forEach(f => {
            let bg = f === 'idx' ? '#333' : (f.startsWith('collection_') ? '#b71c1c' : (f.startsWith('thing_') ? '#008080' : '#1976d2'));
            html += `<th style='background:${bg}; color:#fff; font-weight:600; position:sticky; top:0; z-index:2;'>${f}</th>`;
        });
        html += `</tr></thead><tbody>`;
    pagedRecords.forEach((rec, i) => {
            html += '<tr>';
            displayFields.forEach((f, colIdx) => {
                if (f === 'idx') {
                    html += `<td style='font-size:0.98em; color:#222; font-weight:bold;'>${startIdx + i + 1}</td>`;
                } else if (/image|thumbnail/i.test(f) && rec[f]) {
                    // Use larger size for main images, smaller for thumbnails
                    const isThumb = /thumbnail/i.test(f);
                    const maxW = isThumb ? 80 : 120;
                    const maxH = isThumb ? 60 : 90;
                    const radius = isThumb ? 6 : 8;
                    html += `<td style='font-size:0.98em; color:#222;'><img src='${rec[f]}' alt='${f}' style='max-width:${maxW}px; max-height:${maxH}px; border-radius:${radius}px;'></td>`;
                } else if (f === 'thing_poll_numplayers_table' && rec[f]) {
                    html += `<td style='font-size:0.98em; color:#222;'>${rec[f]}</td>`;
                } else {
                    let val = rec[f] !== undefined ? rec[f] : '';
                    if (f === 'thing_name_alternate' && typeof val === 'string') {
                        let arr = val.split(/,\s?/);
                        if (arr.length > 5) {
                            val = arr.slice(0,5).join('\n') + '\n...';
                        } else {
                            val = arr.join('\n');
                        }
                    } else if (typeof val === 'string') {
                        const lines = val.split(/\r?\n/);
                        if (val.length > 100 || lines.length > 10) {
                            val = val.slice(0, 100);
                            if (lines.length > 10) {
                                val = lines.slice(0, 10).join('\n');
                            }
                            val += '...';
                        }
                    }
                    html += `<td style='font-size:0.98em; color:#222; white-space:pre-line;'>${val}</td>`;
                }
            });
            html += '</tr>';
        });
    html += '</tbody></table></div>';
    return html;
    }
    // Pagination controls rendering
    function renderPagination() {
        if (!paginationTop || !paginationBottom) return;
        const makeControls = () => {
            return `
                    <div style="display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:0.7em; width:100%; max-width:100vw;">
                        <button id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''} style="padding:7px 16px; font-size:1em; border-radius:6px;">Prev</button>
                        <span style="font-size:1em;">Page</span>
                        <input id="pageInput" type="number" min="1" max="${totalPages}" value="${currentPage}" style="width:54px; font-size:1em; text-align:center; border-radius:5px; border:1px solid #bbb; max-width:70px;">
                        <span style="font-size:1em;">of ${totalPages}</span>
                        <button id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''} style="padding:7px 16px; font-size:1em; border-radius:6px;">Next</button>
                        <span style="color:#888; font-size:0.98em; margin-left:0.7em;">(${lastFilteredArr.length} records)</span>
                    </div>
            `;
        };
        paginationTop.innerHTML = makeControls();
        paginationBottom.innerHTML = makeControls();
        // Add event listeners
        const prevBtns = document.querySelectorAll('#prevPageBtn');
        const nextBtns = document.querySelectorAll('#nextPageBtn');
        const pageInputs = document.querySelectorAll('#pageInput');
        prevBtns.forEach(btn => btn.onclick = () => { if (currentPage > 1) { currentPage--; updateTable(); }});
        nextBtns.forEach(btn => btn.onclick = () => { if (currentPage < totalPages) { currentPage++; updateTable(); }});
        pageInputs.forEach(input => {
            input.onchange = (e) => {
                let val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    currentPage = val;
                    updateTable();
                } else {
                    e.target.value = currentPage;
                }
            };
        });
    }
    // Update table and pagination
    function updateTable() {
        if (window.lastRecords && window.lastFields && window.lastDisplayFields) {
            let arr = lastFilteredArr;
            if (!arr || !Array.isArray(arr)) arr = window.lastRecords;
            resultDiv.innerHTML = renderTable(arr, window.lastFields, window.lastDisplayFields);
            renderPagination();
        }
    }
    const searchInput = document.getElementById('searchInput');
    let lastSearchTerm = '';
    function filterRecords(records, fields, term) {
    if (!term) return records;
        const lc = term.toLowerCase();
        let searchFields = fields;
        if (searchNameOnly && searchNameOnly.checked) {
            searchFields = fields.filter(f => /name.*primary|name$/i.test(f));
            if (searchFields.length === 0) searchFields = fields.filter(f => /name/i.test(f));
        }
    return records.filter(rec => searchFields.some(f => (rec[f] + '').toLowerCase().includes(lc)));
    }
    // Settings modal logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsColumnsDiv = document.getElementById('settingsColumns');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const selectNoneBtn = document.getElementById('selectNoneBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    let allColumns = [];
    let selectedColumns = [];
    // Load from sessionStorage if available
    if (sessionStorage.getItem('selectedColumns')) {
        selectedColumns = JSON.parse(sessionStorage.getItem('selectedColumns'));
    }
    function showSettingsModal(columns) {
        allColumns = columns;
        settingsColumnsDiv.innerHTML = '';
        columns.forEach(col => {
            const id = 'col_' + col.replace(/[^a-zA-Z0-9_]/g, '_');
            const checked = selectedColumns.length === 0 || selectedColumns.includes(col) ? 'checked' : '';
            settingsColumnsDiv.innerHTML += `<div style='margin-bottom:4px;'><label><input type='checkbox' class='colCheckbox' id='${id}' value='${col}' ${checked}> ${col}</label></div>`;
        });
        settingsModal.style.display = 'flex';
    }
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            // Use last fields if available, else default
            if (allColumns.length === 0 && window.lastFields) allColumns = window.lastFields;
            showSettingsModal(allColumns);
        };
    }
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => { settingsModal.style.display = 'none'; };
    if (selectAllBtn) selectAllBtn.onclick = () => {
        document.querySelectorAll('.colCheckbox').forEach(cb => cb.checked = true);
    };
    if (selectNoneBtn) selectNoneBtn.onclick = () => {
        document.querySelectorAll('.colCheckbox').forEach(cb => cb.checked = false);
    };
    if (saveSettingsBtn) saveSettingsBtn.onclick = () => {
    selectedColumns = Array.from(document.querySelectorAll('.colCheckbox')).filter(cb => cb.checked).map(cb => cb.value);
    sessionStorage.setItem('selectedColumns', JSON.stringify(selectedColumns));
    settingsModal.style.display = 'none';
    };
    const runBtn = document.getElementById('runApiBtn');
    const resultDiv = document.getElementById('apiResult');
    if (runBtn && resultDiv) {
        runBtn.onclick = async function() {
            currentPage = 1;
            console.log('RUN button clicked, starting API calls...');
            resultDiv.innerHTML = '<span style="color:#888;">Loading collection...</span>';
            try {
                console.log('Starting collection API fetch...');
                // Get max records from input
                let maxRecords = 50;
                const maxInput = document.getElementById('maxRecordsInput');
                if (maxInput && !isNaN(parseInt(maxInput.value))) {
                    maxRecords = Math.max(1, Math.min(200, parseInt(maxInput.value)));
                }
                // API 1: Fetch user collection
                const resp = await fetch('https://boardgamegeek.com/xmlapi2/collection?stats=1&username=sportomax&own=1');
                if (!resp.ok) throw new Error('API error');
                const xml = await resp.text();
                const parser = new window.DOMParser();
                const doc = parser.parseFromString(xml, 'text/xml');
                let items = Array.from(doc.querySelectorAll('item'));
                // Only process up to maxRecords
                items = items.slice(0, maxRecords);
                if (!items.length) {
                    let diag = `<div style='color:#c00;'><b>Error: No records found.</b></div>`;
                    diag += `<div style='margin:8px 0;'><b>Parsed items:</b> ${doc.querySelectorAll('item').length}</div>`;
                    diag += `<details><summary>Show raw XML response</summary><pre style='max-height:300px;overflow:auto;background:#f8f8f8;border:1px solid #ccc;'>${xml.replace(/</g,'&lt;')}</pre></details>`;
                    resultDiv.innerHTML = diag;
                    return;
                }
                                // Add progress bar
                                resultDiv.innerHTML = `
                                    <div id="progressContainer" style="width:80%;margin:20px auto 10px auto;max-width:500px;">
                                        <div id="progressBar" style="height:22px;width:0%;background:#1976d2;border-radius:8px;transition:width 0.3s;"></div>
                                    </div>
                                    <div id="progressText" style="text-align:center;font-size:1.1em;margin-bottom:10px;">Loading details for each game...</div>
                                `;
                                const progressBar = document.getElementById('progressBar');
                                const progressText = document.getElementById('progressText');
                console.log('Collection API fetch complete, starting thing API calls...');
                // API 2: Fetch thing details for each objectid
                // Helper to deeply flatten XML into a flat object with combined values for repeated fields
                function flattenXML(node, prefix = '', out = {}) {
                    // Attributes
                    if (node.attributes) {
                        Array.from(node.attributes).forEach(attr => {
                            out[prefix + attr.name] = attr.value;
                        });
                    }
                    // Children
                    Array.from(node.children || []).forEach(child => {
                        const tag = child.tagName;
                        // For links, names, expansions, publishers, etc, combine by type or tag
                        if (tag === 'link' || tag === 'name') {
                            const type = child.getAttribute('type') || tag;
                            const key = prefix + tag + '_' + type;
                            const val = child.getAttribute('value') || child.getAttribute('id') || child.textContent;
                            if (!out[key]) out[key] = [];
                            out[key].push(val);
                        } else if (tag === 'rank') {
                            // For ranks, combine by name/type
                            const name = child.getAttribute('name') || 'rank';
                            const key = prefix + 'rank_' + name;
                            out[key] = Array.from(child.attributes).map(a => `${a.name}:${a.value}`).join('; ');
                        } else if (child.children.length === 0 && child.textContent) {
                            // Simple text node
                            out[prefix + tag] = child.textContent;
                        } else {
                            // Nested: recurse
                            flattenXML(child, prefix + tag + '_', out);
                        }
                    });
                    return out;
                }

                // Batch objectids in groups of 20 for the second API call
                const objectids = items.map(item => item.getAttribute('objectid'));
                function chunk(arr, size) {
                    const out = [];
                    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
                    return out;
                }
                const batches = chunk(objectids, 20);
                let thingItems = [];
                // Helper to pause between requests
                function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
                let batchNum = 0;
                const batchStartTime = Date.now();
                for (const batch of batches) {
                    const ids = batch.join(',');
                    try {
                        const resp = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`);
                        if (!resp.ok) throw new Error('Thing API error');
                        const xml = await resp.text();
                        const parser = new window.DOMParser();
                        const doc = parser.parseFromString(xml, 'text/xml');
                        const itemsInBatch = Array.from(doc.querySelectorAll('item'));
                        thingItems = thingItems.concat(itemsInBatch);
                    } catch (e) {
                        console.log('Thing batch fetch error:', e);
                    }
                    batchNum++;
                    // Update progress bar
                    const percent = Math.round((batchNum / batches.length) * 100);
                    if (progressBar) progressBar.style.width = percent + '%';
                    const elapsed = ((Date.now() - batchStartTime) / 1000).toFixed(1);
                    if (progressText) progressText.textContent = `Loading details: Batch ${batchNum} of ${batches.length} (${percent}%) - ${elapsed}s`;
                    await sleep(1000);
                }
                // Map objectid to flattened thing data
                const thingMap = {};
                // Helper to extract and format poll data for number of players
                function extractPollTable(thingItem) {
                    const poll = thingItem.querySelector('poll[name="suggested_numplayers"]');
                    if (!poll) return '';
                    let html = `<table style='border-collapse:collapse; font-size:0.98em; background:#f9f9f9; margin:0 auto;'>`;
                    html += `<tr><th style='padding:2px 6px; background:#eee; font-weight:600;'># Players</th><th style='padding:2px 6px; background:#eee;'>Best</th><th style='padding:2px 6px; background:#eee;'>Recommended</th><th style='padding:2px 6px; background:#eee;'>Not Rec.</th></tr>`;
                    const results = poll.querySelectorAll('results');
                    results.forEach(res => {
                        const num = res.getAttribute('numplayers');
                        let best = 0, rec = 0, not = 0;
                        res.querySelectorAll('result').forEach(r => {
                            const v = r.getAttribute('value');
                            const n = parseInt(r.getAttribute('numvotes')||'0',10);
                            if (v === 'Best') best = n;
                            else if (v === 'Recommended') rec = n;
                            else if (v === 'Not Recommended') not = n;
                        });
                        html += `<tr><td style='padding:2px 6px; text-align:center;'>${num}</td>` +
                            `<td style='padding:2px 6px; color:#fff; background:#388e3c; text-align:center;'>${best}</td>` +
                            `<td style='padding:2px 6px; color:#fff; background:#1976d2; text-align:center;'>${rec}</td>` +
                            `<td style='padding:2px 6px; color:#fff; background:#b71c1c; text-align:center;'>${not}</td></tr>`;
                    });
                    html += `</table>`;
                    return html;
                }
                thingItems.forEach(thingItem => {
                    const objectid = thingItem.getAttribute('id');
                    const flat = flattenXML(thingItem);
                    Object.keys(flat).forEach(k => {
                        if (Array.isArray(flat[k])) flat[k] = flat[k].join(', ');
                    });
                    // Add pretty poll table as a special field
                    flat['poll_numplayers_table'] = extractPollTable(thingItem);
                    thingMap[objectid] = flat;
                });
                // Merge collection and thing data
                const thingArr = items.map(item => {
                    const rec = {};
                    Array.from(item.attributes).forEach(attr => {
                        rec['collection_' + attr.name] = attr.value;
                    });
                    Array.from(item.children).forEach(child => {
                        if (child.tagName === 'status') {
                            // Flatten status attributes
                            Array.from(child.attributes).forEach(attr => {
                                rec['collection_status_' + attr.name] = attr.value;
                            });
                        } else if (child.tagName === 'stats') {
                            // Flatten stats attributes
                            Array.from(child.attributes).forEach(attr => {
                                rec['collection_stats_' + attr.name] = attr.value;
                            });
                            // Flatten rating inside stats
                            const rating = child.querySelector('rating');
                            if (rating) {
                                Array.from(rating.attributes).forEach(attr => {
                                    rec['collection_rating_' + attr.name] = attr.value;
                                });
                                // usersrated, average, bayesaverage, stddev, median
                                ['usersrated','average','bayesaverage','stddev','median'].forEach(tag => {
                                    const el = rating.querySelector(tag);
                                    if (el && el.hasAttribute('value')) {
                                        rec['collection_rating_' + tag] = el.getAttribute('value');
                                    }
                                });
                            }
                        } else if (child.children.length === 0 && child.textContent) {
                            rec['collection_' + child.tagName] = child.textContent;
                        } else if (child.tagName === 'name') {
                            const key = 'collection_name_' + (child.getAttribute('type') || 'unknown');
                            if (!rec[key]) rec[key] = [];
                            rec[key].push(child.getAttribute('value'));
                        } else if (child.tagName === 'link') {
                            const type = child.getAttribute('type') || 'unknown';
                            const key = 'collection_link_' + type;
                            if (!rec[key]) rec[key] = [];
                            rec[key].push(child.getAttribute('value'));
                        } else {
                            rec['collection_' + child.tagName] = child.outerHTML;
                        }
                    });
                    Object.keys(rec).forEach(k => {
                        if (Array.isArray(rec[k])) rec[k] = rec[k].join(', ');
                    });
                    const objectid = item.getAttribute('objectid');
                    const flat = thingMap[objectid];
                    if (flat) {
                        Object.keys(flat).forEach(k => {
                            rec['thing_' + k] = flat[k];
                        });
                    }
                    return rec;
                });
                // Build table with ordered columns: collection_ fields first, then thing_ fields
                const collectionKeys = [];
                let thingKeys = [];
                // Try to order thingKeys as in the first thingItem's XML
                if (thingItems.length > 0) {
                    const flatFirst = flattenXML(thingItems[0]);
                    thingKeys = Object.keys(flatFirst).map(k => 'thing_' + k);
                }
                // Add any extra thingKeys not in the first item (fallback for missing fields)
                thingArr.forEach(obj => {
                    Object.keys(obj).forEach(k => {
                        if (k.startsWith('collection_')) {
                            if (!collectionKeys.includes(k)) collectionKeys.push(k);
                        } else if (k.startsWith('thing_')) {
                            if (!thingKeys.includes(k)) thingKeys.push(k);
                        }
                    });
                });
                // Add idx as the first column
                const fields = ['idx', ...collectionKeys, ...thingKeys];
                window.lastFields = fields;
                // Use selectedColumns if set
                let displayFields = fields;
                if (selectedColumns.length > 0) {
                    displayFields = fields.filter(f => selectedColumns.includes(f));
                }
                // Save for search
                window.lastFields = fields;
                window.lastRecords = thingArr;
                window.lastDisplayFields = displayFields;
                // Add poll_numplayers_table as a visible column at the end
                // Move thing_poll_numplayers_table after thing_maxplayers_value in displayFields
                const pollCol = 'thing_poll_numplayers_table';
                const maxPlayersCol = 'thing_maxplayers_value';
                let idx = displayFields.indexOf(pollCol);
                if (idx !== -1) displayFields.splice(idx, 1);
                idx = displayFields.indexOf(maxPlayersCol);
                if (idx !== -1) displayFields.splice(idx + 1, 0, pollCol);
                else displayFields.push(pollCol);
                console.log('Ordered table columns:', displayFields);
                console.log('All merged records:', thingArr);
                let html = `<div style='overflow-x:auto;'><table border='1' cellpadding='6' style='border-collapse:collapse; margin:auto; background:#fff; min-width:1200px;'><thead><tr>`;
                displayFields.forEach(f => {
                    let bg = f === 'idx' ? '#333' : (f.startsWith('collection_') ? '#b71c1c' : (f.startsWith('thing_') ? '#008080' : '#1976d2'));
                    html += `<th style='background:${bg}; color:#fff; font-weight:600; position:sticky; top:0; z-index:2;'>${f}</th>`;
                });
                html += `</tr></thead><tbody>`;
                let filteredArr = thingArr;
                let initialFilteredArr = thingArr;
                if (searchInput && searchInput.value.trim()) {
                    initialFilteredArr = filterRecords(thingArr, displayFields, searchInput.value.trim());
                }
                lastFilteredArr = initialFilteredArr;
                resultDiv.innerHTML = renderTable(initialFilteredArr, fields, displayFields);
                renderPagination();
                // Live search: update table as user types
                if (searchInput) {
                    function doLiveSearch() {
                        if (window.lastRecords && window.lastFields && window.lastDisplayFields) {
                            lastFilteredArr = filterRecords(window.lastRecords, window.lastDisplayFields, searchInput.value.trim());
                            currentPage = 1;
                            updateTable();
                        }
                    }
                    searchInput.oninput = doLiveSearch;
                    if (searchNameOnly) searchNameOnly.onchange = doLiveSearch;
                }
            } catch (e) {
                resultDiv.innerHTML = `<span style='color:#c00;'>Error: ${e.message}</span>`;
                renderPagination();
            }
        };
    }
});
