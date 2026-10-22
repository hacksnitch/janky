// DOM Element References
const btnCallApi = document.getElementById('btn-call-api');
const btnClear = document.getElementById('btn-clear');
const btnRefreshDb = document.getElementById('btn-refresh-db');
const btnCopyOutput = document.getElementById('btn-copy-output');
const btnCopyCurl = document.getElementById('btn-copy-curl');
const apiOutput = document.getElementById('api-output');
const responseStatusBadge = document.getElementById('response-status-badge');
const serverStatus = document.getElementById('server-status');
const serverStatusDot = document.querySelector('.badge-dot');
const metadataStrip = document.getElementById('metadata-strip');
const metaStatus = document.getElementById('meta-status');
const metaLatency = document.getElementById('meta-latency');
const metaTime = document.getElementById('meta-time');
const metaId = document.getElementById('meta-id');
const dbTableBody = document.getElementById('db-table-body');
const toastEl = document.getElementById('toast');

let toastTimeout = null;
let lastInsertedId = null;

/**
 * Display a floating toast notification
 */
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2600);
}

/**
 * Check Express & PostgreSQL connection status
 */
async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    serverStatus.textContent = `Connected: Express & PostgreSQL (${data.database.currentDatabase})`;
    serverStatusDot.className = 'badge-dot connected';
  } catch (err) {
    serverStatus.textContent = `Express API Disconnected or DB Error`;
    serverStatusDot.className = 'badge-dot error';
  }
}

/**
 * Fetch and print response from GET /testme
 */
async function callTestMeApi() {
  btnCallApi.disabled = true;
  btnCallApi.classList.add('loading');
  responseStatusBadge.textContent = 'Calling...';
  responseStatusBadge.className = 'status-pill status-idle';

  const startTime = performance.now();

  try {
    const response = await fetch('/testme');
    const latency = Math.round(performance.now() - startTime);
    const textOutput = await response.text();

    // Print what returns from API
    apiOutput.textContent = textOutput;
    apiOutput.classList.add('highlight-result');

    // Update terminal status badge
    if (response.ok) {
      responseStatusBadge.textContent = `${response.status} OK`;
      responseStatusBadge.className = 'status-pill status-success';
    } else {
      responseStatusBadge.textContent = `${response.status} Error`;
      responseStatusBadge.className = 'status-pill status-error';
    }

    // Read headers saved by server
    const recId = response.headers.get('X-Recorded-Id');
    const recTime = response.headers.get('X-Recorded-Time');
    const timeOfDay = response.headers.get('X-Time-Of-Day');

    if (recId) lastInsertedId = parseInt(recId, 10);

    // Update metadata strip
    metaStatus.textContent = `${response.status} ${response.statusText || 'OK'}`;
    metaLatency.textContent = `${latency} ms`;
    metaTime.textContent = timeOfDay ? `${timeOfDay} (${recTime || ''})` : '--';
    metaId.textContent = recId ? `#${recId}` : '--';
    metadataStrip.style.display = 'flex';

    showToast(`Received "${textOutput}" — Stored in PostgreSQL!`);

    // Refresh the DB table
    await loadDbRecords();
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    apiOutput.textContent = `Error calling /testme: ${err.message}`;
    apiOutput.classList.remove('highlight-result');
    responseStatusBadge.textContent = 'Failed';
    responseStatusBadge.className = 'status-pill status-error';

    metaStatus.textContent = 'Failed';
    metaLatency.textContent = `${latency} ms`;
    metaTime.textContent = 'N/A';
    metaId.textContent = 'N/A';
    metadataStrip.style.display = 'flex';

    showToast(`Network Error: ${err.message}`);
  } finally {
    btnCallApi.disabled = false;
    btnCallApi.classList.remove('loading');
  }
}

/**
 * Load recent database records from /api/records
 */
async function loadDbRecords() {
  try {
    const res = await fetch('/api/records?limit=10');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const records = data.records || [];

    if (records.length === 0) {
      dbTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted">No records found. Click the button above to insert the first record!</td>
        </tr>
      `;
      return;
    }

    dbTableBody.innerHTML = records.map((r) => {
      const isNew = r.id === lastInsertedId;
      const isoDate = new Date(r.recorded_at).toLocaleString();
      return `
        <tr class="${isNew ? 'new-row' : ''}">
          <td><strong>#${r.id}</strong></td>
          <td><span style="color: #38bdf8;">${escapeHtml(r.time_of_day)}</span></td>
          <td>${escapeHtml(r.formatted_time)}</td>
          <td class="text-muted">${escapeHtml(isoDate)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    dbTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">Failed to load records: ${escapeHtml(err.message)}</td>
      </tr>
    `;
  }
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Clear the API output display
 */
function clearOutput() {
  apiOutput.textContent = 'Click "Execute GET /testme" above to call the API...';
  apiOutput.classList.remove('highlight-result');
  responseStatusBadge.textContent = 'Ready';
  responseStatusBadge.className = 'status-pill status-idle';
  metadataStrip.style.display = 'none';
  showToast('Console cleared');
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg);
  } catch {
    showToast('Failed to copy text');
  }
}

// Event Listeners
btnCallApi.addEventListener('click', callTestMeApi);
btnClear.addEventListener('click', clearOutput);
btnRefreshDb.addEventListener('click', async () => {
  await loadDbRecords();
  showToast('Refreshed PostgreSQL records');
});

btnCopyOutput.addEventListener('click', () => {
  copyToClipboard(apiOutput.textContent, 'Copied response output!');
});

btnCopyCurl.addEventListener('click', () => {
  copyToClipboard('curl -i http://localhost:3000/testme', 'Copied cURL command!');
});

// Initialization on page load
window.addEventListener('DOMContentLoaded', () => {
  checkServerHealth();
  loadDbRecords();
});
