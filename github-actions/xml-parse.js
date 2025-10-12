let lastHeaders = [];
let lastRows = [];
function isImageUrl(url) {
    return /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

function createTable(headers, rows) {
    // Always add 'idx' as the first column
    let html = '<table><thead><tr><th>idx</th>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach((row, idx) => {
        html += `<tr><td>${idx + 1}</td>`;
        headers.forEach(h => {
            let cell = row[h] ?? '';
            if (typeof cell === 'string' && isImageUrl(cell.trim())) {
                cell = `<img src="${cell.trim()}" alt="img" />`;
            }
            html += `<td>${cell}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function parseCSV(text) {
    // Remove all double quotes from the text
    text = text.replace(/"/g, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i] ?? '');
        return obj;
    });
    return { headers, rows };
}

function parseXML(text) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const root = xml.documentElement;
    let items = [];
    let headers = new Set();

    function flattenElement(node, prefix = "") {
        let obj = {};
        if (node.attributes) {
            for (let attr of node.attributes) {
                obj[prefix + '@' + attr.name] = attr.value;
                headers.add(prefix + '@' + attr.name);
            }
        }
        for (let child of node.children) {
            if (child.children.length > 0 || (child.attributes && child.attributes.length > 0)) {
                Object.assign(obj, flattenElement(child, prefix + child.nodeName + '.'));
            } else {
                obj[prefix + child.nodeName] = child.textContent;
                headers.add(prefix + child.nodeName);
                if (child.attributes && child.attributes.length > 0) {
                    for (let attr of child.attributes) {
                        obj[prefix + child.nodeName + '@' + attr.name] = attr.value;
                        headers.add(prefix + child.nodeName + '@' + attr.name);
                    }
                }
            }
        }
        return obj;
    }

    let rowNodes = [];
    for (let child of root.children) {
        if (child.children.length) rowNodes.push(child);
    }
    if (!rowNodes.length) rowNodes = Array.from(root.children);

    rowNodes.forEach(node => {
        let obj = flattenElement(node);
        if (Object.keys(obj).length) items.push(obj);
    });

    if (!items.length && root.children.length) {
        let obj = flattenElement(root);
        if (Object.keys(obj).length) items.push(obj);
    }

    return { headers: Array.from(headers), rows: items };
}

document.addEventListener('DOMContentLoaded', function() {
    const outputDiv = document.getElementById('output');

    function showLoading(msg, startTime) {
        const now = new Date();
        let timeStr = now.toLocaleTimeString();
        let html = `<div style="color:#4fc3f7;font-weight:bold;margin-bottom:8px;">${msg}`;
        if (startTime) {
            html += ` <span style='color:#aaa;font-weight:normal'>(Started: ${timeStr})</span>`;
        }
        html += '</div>';
        outputDiv.innerHTML = html;
    }

    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const start = performance.now();
        const startDate = new Date();
        showLoading('Loading file...', startDate);
        const reader = new FileReader();
        reader.onload = function(evt) {
            const text = evt.target.result;
            let parseStart = performance.now();
            let data;
            if (file.name.endsWith('.csv')) {
                data = parseCSV(text);
            } else if (file.name.endsWith('.xml')) {
                data = parseXML(text);
            } else {
                outputDiv.innerHTML = 'Unsupported file type.';
                return;
            }
            let renderStart = performance.now();
            let tableHtml = (data.headers.length && data.rows.length) ? createTable(data.headers, data.rows) : 'No data found.';
            let end = performance.now();
            let endDate = new Date();
            let duration = ((end - start) / 1000).toFixed(3);
            let parseDuration = ((renderStart - parseStart) / 1000).toFixed(3);
            let renderDuration = ((end - renderStart) / 1000).toFixed(3);
            let recordCount = data.rows.length;
            lastHeaders = data.headers;
            lastRows = data.rows;
            document.getElementById('cardViewBtn').style.display = recordCount ? '' : 'none';
            outputDiv.innerHTML = `<div style='color:#4fc3f7;font-weight:bold;margin-bottom:8px;'>File loaded (Started: ${startDate.toLocaleTimeString()}, Ended: ${endDate.toLocaleTimeString()}, Total: ${duration} s, Parse: ${parseDuration} s, Render: ${renderDuration} s, Records: ${recordCount}</div>` + tableHtml;
        };
        reader.readAsText(file);
    });

    document.getElementById('parseTextBtn').addEventListener('click', function() {
        const text = document.getElementById('textInput').value.trim();
        if (!text) {
            outputDiv.innerHTML = 'Please paste XML or CSV text.';
            return;
        }
        const start = performance.now();
        const startDate = new Date();
        showLoading('Parsing pasted text...', startDate);
        let parseStart = performance.now();
        let data;
        if (text[0] === '<') {
            data = parseXML(text);
        } else {
            data = parseCSV(text);
        }
        let renderStart = performance.now();
        let tableHtml = (data.headers.length && data.rows.length) ? createTable(data.headers, data.rows) : 'No data found.';
        let end = performance.now();
        let endDate = new Date();
        let duration = ((end - start) / 1000).toFixed(3);
        let parseDuration = ((renderStart - parseStart) / 1000).toFixed(3);
        let renderDuration = ((end - renderStart) / 1000).toFixed(3);
    let recordCount = data.rows.length;
    lastHeaders = data.headers;
    lastRows = data.rows;
    document.getElementById('cardViewBtn').style.display = recordCount ? '' : 'none';
    outputDiv.innerHTML = `<div style='color:#4fc3f7;font-weight:bold;margin-bottom:8px;'>Pasted text parsed (Started: ${startDate.toLocaleTimeString()}, Ended: ${endDate.toLocaleTimeString()}, Total: ${duration} s, Parse: ${parseDuration} s, Render: ${renderDuration} s, Records: ${recordCount}</div>` + tableHtml;
    });

    document.getElementById('bggApiBtn').addEventListener('click', function() {
        // Example: sportomax stats=1 collection v2 API call
        // You may want to customize the username or parameters as needed
        const username = 'sportomax';
        const url = `https://boardgamegeek.com/xmlapi2/collection?username=${username}&stats=1`;
        const start = performance.now();
        const startDate = new Date();
        showLoading('Loading BGG collection for ' + username + '...', startDate);
        fetch(url)
            .then(resp => resp.text())
            .then(xmlText => {
                let parseStart = performance.now();
                let data = parseXML(xmlText);
                let renderStart = performance.now();
                let tableHtml = (data.headers.length && data.rows.length) ? createTable(data.headers, data.rows) : 'No data found.';
                let end = performance.now();
                let endDate = new Date();
                let duration = ((end - start) / 1000).toFixed(3);
                let parseDuration = ((renderStart - parseStart) / 1000).toFixed(3);
                let renderDuration = ((end - renderStart) / 1000).toFixed(3);
                let recordCount = data.rows.length;
                lastHeaders = data.headers;
                lastRows = data.rows;
                document.getElementById('cardViewBtn').style.display = recordCount ? '' : 'none';
                outputDiv.innerHTML = `<div style='color:#4fc3f7;font-weight:bold;margin-bottom:8px;'>BGG API loaded (Started: ${startDate.toLocaleTimeString()}, Ended: ${endDate.toLocaleTimeString()}, Total: ${duration} s, Parse: ${parseDuration} s, Render: ${renderDuration} s, Records: ${recordCount}</div>` + tableHtml;
// Card View Modal logic
function renderCardFieldSelect(headers, selectedFields) {
    return '<div style="margin-bottom:8px;">Choose fields to display:<br>' +
        headers.map(h => `<label style='margin-right:8px;'><input type='checkbox' class='cardFieldChk' value='${h.replace(/'/g, "&#39;")}' ${selectedFields.includes(h) ? 'checked' : ''}/> ${h}</label>`).join('') +
        '</div>';
}

function renderCardList(rows, fields) {
    if (!fields.length) return '<div style="color:#f55;">No fields selected.</div>';
    return rows.map((row, idx) => {
        return `<div style="background:#26324a;margin-bottom:14px;padding:12px 10px;border-radius:8px;box-shadow:0 2px 8px #0004;max-width:370px;">
            <div style='font-weight:bold;color:#4fc3f7;margin-bottom:4px;'>#${idx+1}</div>
            ${fields.map(f => `<div style='margin-bottom:2px;'><span style='color:#aaa;'>${f}:</span> <span>${row[f] ?? ''}</span></div>`).join('')}
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    const cardViewBtn = document.getElementById('cardViewBtn');
    const cardModal = document.getElementById('cardModal');
    const cardModalContent = document.getElementById('cardModalContent');
    const cardFieldSelect = document.getElementById('cardFieldSelect');
    const cardList = document.getElementById('cardList');
    const closeCardModal = document.getElementById('closeCardModal');
    let cardFields = [];

    cardViewBtn.onclick = function() {
        if (!lastHeaders.length || !lastRows.length) return;
        // Default: show first 3 fields or all if less
        if (!cardFields.length) cardFields = lastHeaders.slice(0, 3);
        cardFieldSelect.innerHTML = renderCardFieldSelect(lastHeaders, cardFields);
        cardList.innerHTML = renderCardList(lastRows, cardFields);
        cardModal.style.display = 'flex';
    };
    closeCardModal.onclick = function() {
        cardModal.style.display = 'none';
    };
    cardFieldSelect.addEventListener('change', function(e) {
        if (e.target.classList.contains('cardFieldChk')) {
            const checkboxes = cardFieldSelect.querySelectorAll('.cardFieldChk');
            cardFields = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            cardList.innerHTML = renderCardList(lastRows, cardFields);
        }
    });
    // Close modal on outside click
    cardModal.addEventListener('click', function(e) {
        if (e.target === cardModal) cardModal.style.display = 'none';
    });
});
            })
            .catch(err => {
                outputDiv.innerHTML = 'Error loading BGG API: ' + err;
            });
    });
});
