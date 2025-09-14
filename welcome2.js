console.log('Welcome2 page loaded! (script start)');

document.addEventListener('DOMContentLoaded', function() {
    const runBtn = document.getElementById('runApiBtn');
    const resultDiv = document.getElementById('apiResult');
    if (runBtn && resultDiv) {
        runBtn.onclick = async function() {
            console.log('RUN button clicked, starting API calls...');
            resultDiv.innerHTML = '<span style="color:#888;">Loading collection...</span>';
            try {
                console.log('Starting collection API fetch...');
                // API 1: Fetch user collection
                const resp = await fetch('https://boardgamegeek.com/xmlapi2/collection?stats=1&username=sportomax');
                if (!resp.ok) throw new Error('API error');
                const xml = await resp.text();
                const parser = new window.DOMParser();
                const doc = parser.parseFromString(xml, 'text/xml');
                let items = Array.from(doc.querySelectorAll('item'));
                // Only process the first 50 records
                items = items.slice(0, 50);
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
                    if (progressText) progressText.textContent = `Loading details: Batch ${batchNum} of ${batches.length} (${percent}%)`;
                    await sleep(1000);
                }
                // Map objectid to flattened thing data
                const thingMap = {};
                thingItems.forEach(thingItem => {
                    const objectid = thingItem.getAttribute('id');
                    const flat = flattenXML(thingItem);
                    Object.keys(flat).forEach(k => {
                        if (Array.isArray(flat[k])) flat[k] = flat[k].join(', ');
                    });
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
                const thingKeys = [];
                thingArr.forEach(obj => {
                    Object.keys(obj).forEach(k => {
                        if (k.startsWith('collection_')) {
                            if (!collectionKeys.includes(k)) collectionKeys.push(k);
                        } else if (k.startsWith('thing_')) {
                            if (!thingKeys.includes(k)) thingKeys.push(k);
                        }
                    });
                });
                const fields = [...collectionKeys, ...thingKeys];
                console.log('Ordered table columns:', fields);
                console.log('All merged records:', thingArr);
                let html = `<div style='overflow-x:auto;'><table border='1' cellpadding='6' style='border-collapse:collapse; margin:auto; background:#fff; min-width:1200px;'><thead><tr>`;
                fields.forEach(f => {
                    let bg = f.startsWith('collection_') ? '#b71c1c' : (f.startsWith('thing_') ? '#008080' : '#1976d2');
                    html += `<th style='background:${bg}; color:#fff; font-weight:600; position:sticky; top:0; z-index:2;'>${f}</th>`;
                });
                html += `</tr></thead><tbody>`;
                thingArr.forEach(rec => {
                    html += '<tr>';
                    fields.forEach(f => {
                        if (/image|thumbnail/i.test(f) && rec[f]) {
                            // Use larger size for main images, smaller for thumbnails
                            const isThumb = /thumbnail/i.test(f);
                            const maxW = isThumb ? 80 : 120;
                            const maxH = isThumb ? 60 : 90;
                            const radius = isThumb ? 6 : 8;
                            html += `<td style='font-size:0.98em; color:#222;'><img src='${rec[f]}' alt='${f}' style='max-width:${maxW}px; max-height:${maxH}px; border-radius:${radius}px;'></td>`;
                        } else {
                            let val = rec[f] !== undefined ? rec[f] : '';
                            if (typeof val === 'string') {
                                const lines = val.split(/\r?\n/);
                                if (val.length > 100 || lines.length > 10) {
                                    val = val.slice(0, 100);
                                    if (lines.length > 10) {
                                        val = lines.slice(0, 10).join('\n');
                                    }
                                    val += '...';
                                }
                            }
                            html += `<td style='font-size:0.98em; color:#222;'>${val}</td>`;
                        }
                    });
                    html += '</tr>';
                });
                html += '</tbody></table></div>';
                resultDiv.innerHTML = html;
            } catch (e) {
                resultDiv.innerHTML = `<span style='color:#c00;'>Error: ${e.message}</span>`;
            }
        };
    }
});
