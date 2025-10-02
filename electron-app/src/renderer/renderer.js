const { ipcRenderer } = require('electron');
const fs = require('fs');

// API Configuration
let API_URL = 'http://127.0.0.1:8765';

// Application state
const state = {
    reviewerName: '',
    dataSource: null,
    localDirectory: '',
    apiFile: '',
    dateStart: '',
    dateEnd: '',
    apiLimit: 20,
    questionOptions: [],
    questionCounts: {},
    selectedQuestions: [],
    buckets: [],
    percent: 10.0,
    includeKnownBad: false,
    knownBadDir: '',
    knownBadCount: 0,
    currentVisitIndex: 0,
    totalVisits: 0,
    currentVisit: null
};

// DOM Elements
const elements = {
    // Screens
    configScreen: document.getElementById('config-screen'),
    reviewScreen: document.getElementById('review-screen'),
    
    // Config screen elements
    reviewerName: document.getElementById('reviewer-name'),
    sourceLocal: document.getElementById('source-local'),
    sourceApi: document.getElementById('source-api'),
    statusMessage: document.getElementById('status-message'),
    dataSourceContainer: document.getElementById('data-source-container'),
    
    // Local directory controls
    localControls: document.getElementById('local-controls'),
    localDirectory: document.getElementById('local-directory'),
    browseLocal: document.getElementById('browse-local'),
    checkLocalData: document.getElementById('check-local-data'),
    
    // API controls
    apiControls: document.getElementById('api-controls'),
    dateStart: document.getElementById('date-start'),
    dateEnd: document.getElementById('date-end'),
    apiLimit: document.getElementById('api-limit'),
    apiFile: document.getElementById('api-file'),
    browseApiFile: document.getElementById('browse-api-file'),
    checkApiData: document.getElementById('check-api-data'),
    
    // Filter and config
    photoFilterList: document.getElementById('photo-filter-list'),
    buckets: document.getElementById('buckets'),
    percent: document.getElementById('percent'),
    percentCount: document.getElementById('percent-count'),
    includeKnownBad: document.getElementById('include-known-bad'),
    knownBadControls: document.getElementById('known-bad-controls'),
    knownBadDir: document.getElementById('known-bad-dir'),
    browseKnownBad: document.getElementById('browse-known-bad'),
    knownBadCount: document.getElementById('known-bad-count'),
    startReview: document.getElementById('start-review'),
    
    // Review screen elements
    progressText: document.getElementById('progress-text'),
    backToConfig: document.getElementById('back-to-config'),
    photoContainer: document.getElementById('photo-container'),
    bucketButtons: document.getElementById('bucket-buttons'),
    
    // Loading overlay
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text')
};

// Initialize
async function init() {
    // Get API URL from main process
    API_URL = await ipcRenderer.invoke('get-api-url');
    
    // Set up event listeners
    setupEventListeners();
    
    // Set today's date as default end date
    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;
    elements.dateEnd.value = formattedDate;
    
    // Load saved settings
    await loadSettings();
}

function setupEventListeners() {
    // Data source selection
    elements.sourceLocal.addEventListener('change', () => handleDataSourceChange('local'));
    elements.sourceApi.addEventListener('change', () => handleDataSourceChange('api'));
    
    // Browse buttons
    elements.browseLocal.addEventListener('click', browseLocalDirectory);
    elements.browseApiFile.addEventListener('click', browseApiFile);
    elements.browseKnownBad.addEventListener('click', browseKnownBadDirectory);
    
    // Check data buttons
    elements.checkLocalData.addEventListener('click', checkLocalData);
    elements.checkApiData.addEventListener('click', checkApiData);
    
    // Known bad photos checkbox
    elements.includeKnownBad.addEventListener('change', toggleKnownBadControls);
    
    // Percent input
    elements.percent.addEventListener('input', updatePercentCount);
    
    // Start review button
    elements.startReview.addEventListener('click', startReview);
    
    // Back to config button
    elements.backToConfig.addEventListener('click', backToConfig);
}

function handleDataSourceChange(source) {
    state.dataSource = source;
    
    // Show data source container
    elements.dataSourceContainer.style.display = 'block';
    
    if (source === 'local') {
        elements.localControls.style.display = 'block';
        elements.apiControls.style.display = 'none';
        elements.statusMessage.textContent = 'Select a directory and click \'Check Photo Data\'';
        elements.statusMessage.className = 'status-message';
    } else if (source === 'api') {
        elements.localControls.style.display = 'none';
        elements.apiControls.style.display = 'block';
        elements.statusMessage.textContent = 'Configure API settings and click \'Check Photo Data\'';
        elements.statusMessage.className = 'status-message';
        resetPhotoFilter();
    }
}

async function browseLocalDirectory() {
    const path = await ipcRenderer.invoke('select-directory');
    if (path) {
        elements.localDirectory.value = path;
        state.localDirectory = path;
    }
}

async function browseApiFile() {
    const path = await ipcRenderer.invoke('select-file', {
        filters: [
            { name: 'Text Files', extensions: ['txt', 'json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (path) {
        elements.apiFile.value = path;
        state.apiFile = path;
        await saveSettings();
    }
}

async function browseKnownBadDirectory() {
    const path = await ipcRenderer.invoke('select-directory');
    if (path) {
        elements.knownBadDir.value = path;
        state.knownBadDir = path;
    }
}

function toggleKnownBadControls() {
    state.includeKnownBad = elements.includeKnownBad.checked;
    elements.knownBadControls.style.display = state.includeKnownBad ? 'block' : 'none';
}

async function checkLocalData() {
    const directory = elements.localDirectory.value;
    
    if (!directory) {
        showError('Please select a directory');
        return;
    }
    
    showLoading('Scanning directory for photos...');
    
    try {
        const response = await fetch(`${API_URL}/scan-directory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directory })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to scan directory');
        }
        
        state.questionOptions = data.question_options;
        state.questionCounts = data.question_counts;
        
        // Update UI
        if (data.has_invalid) {
            showWarning('Some files do not match required format. Please download multimedia from CommCareHQ.');
        } else {
            showSuccess(`${data.valid_count} photos found`);
        }
        
        refreshQuestionMenu();
        await saveSettings();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function checkApiData() {
    const apiFile = elements.apiFile.value;
    const dateStart = convertDateFormat(elements.dateStart.value);
    const dateEnd = convertDateFormat(elements.dateEnd.value);
    const limit = parseInt(elements.apiLimit.value);
    
    if (!apiFile) {
        showError('Please select a domain/app pairs file');
        return;
    }
    
    if (!dateStart || !dateEnd) {
        showError('Please enter valid dates in MM/DD/YY format');
        return;
    }
    
    if (limit < 20 || limit > 1000) {
        showError('API limit must be between 20 and 1000');
        return;
    }
    
    showLoading('Downloading photos from API...<br>This may take several minutes.');
    
    try {
        const response = await fetch(`${API_URL}/api-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_file: apiFile,
                date_start: dateStart,
                date_end: dateEnd,
                limit: limit
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to download API data');
        }
        
        state.questionOptions = data.question_options;
        state.questionCounts = data.question_counts;
        
        showSuccess(`Downloaded ${data.downloaded_count} photos from API`);
        refreshQuestionMenu();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function convertDateFormat(dateStr) {
    // Convert MM/DD/YY to YYYY-MM-DD
    try {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return '';
        
        let [month, day, year] = parts.map(p => parseInt(p));
        
        // Convert 2-digit year to 4-digit
        if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
        }
        
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch (e) {
        return '';
    }
}

function refreshQuestionMenu() {
    elements.photoFilterList.innerHTML = '';
    state.selectedQuestions = [];
    
    state.questionOptions.forEach(question => {
        const count = state.questionCounts[question] || 0;
        
        const div = document.createElement('div');
        div.className = 'filter-item';
        
        const label = document.createElement('label');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.value = question;
        checkbox.addEventListener('change', updateSelectedQuestions);
        
        const text = document.createTextNode(`${question} (${count} photos)`);
        
        label.appendChild(checkbox);
        label.appendChild(text);
        div.appendChild(label);
        
        elements.photoFilterList.appendChild(div);
    });
    
    updateSelectedQuestions();
}

function updateSelectedQuestions() {
    const checkboxes = elements.photoFilterList.querySelectorAll('input[type="checkbox"]');
    state.selectedQuestions = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    updatePercentCount();
}

function updatePercentCount() {
    const percent = parseFloat(elements.percent.value) || 0;
    
    // Count total photos in selected questions
    let totalPhotos = 0;
    state.selectedQuestions.forEach(q => {
        totalPhotos += state.questionCounts[q] || 0;
    });
    
    const count = Math.round(totalPhotos * (percent / 100));
    elements.percentCount.textContent = `(~${count} photos)`;
}

function resetPhotoFilter() {
    elements.photoFilterList.innerHTML = '';
    state.questionOptions = [];
    state.questionCounts = {};
    state.selectedQuestions = [];
    updatePercentCount();
}

async function startReview() {
    // Validate inputs
    const reviewerName = elements.reviewerName.value.trim();
    if (!reviewerName) {
        showError('Please enter your reviewer name');
        return;
    }
    
    if (state.selectedQuestions.length === 0) {
        showError('Please select at least one question');
        return;
    }
    
    const buckets = elements.buckets.value.split(',').map(b => b.trim()).filter(b => b);
    if (buckets.length < 2) {
        showError('Please provide at least two buckets (comma-separated)');
        return;
    }
    
    const percent = parseFloat(elements.percent.value);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
        showError('Percent must be between 0 and 100');
        return;
    }
    
    // Validate known bad configuration
    let knownBadDir = null;
    let knownBadCount = null;
    
    if (elements.includeKnownBad.checked) {
        knownBadDir = elements.knownBadDir.value.trim();
        knownBadCount = parseInt(elements.knownBadCount.value);
        
        if (!knownBadDir || !knownBadCount || knownBadCount <= 0) {
            showError('Bad photo information not configured correctly');
            return;
        }
    }
    
    // Save state
    state.reviewerName = reviewerName;
    state.buckets = buckets;
    state.percent = percent;
    state.knownBadDir = knownBadDir;
    state.knownBadCount = knownBadCount;
    
    await saveSettings();
    
    showLoading('Building review session...');
    
    try {
        const response = await fetch(`${API_URL}/build-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question_ids: state.selectedQuestions,
                buckets: buckets,
                percent: percent,
                include_known_bad: elements.includeKnownBad.checked,
                known_bad_dir: knownBadDir,
                known_bad_count: knownBadCount
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to build session');
        }
        
        state.totalVisits = data.visit_count;
        state.currentVisitIndex = 0;
        
        // Switch to review screen
        showReviewScreen();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function showReviewScreen() {
    elements.configScreen.style.display = 'none';
    elements.reviewScreen.style.display = 'flex';
    
    // Create bucket buttons
    elements.bucketButtons.innerHTML = '';
    state.buckets.forEach(bucket => {
        const btn = document.createElement('button');
        btn.className = 'bucket-btn';
        btn.textContent = bucket;
        btn.addEventListener('click', () => recordAndNext(bucket));
        elements.bucketButtons.appendChild(btn);
    });
    
    // Load first visit
    await loadCurrentVisit();
}

async function loadCurrentVisit() {
    showLoading('Loading photos...');
    
    try {
        const response = await fetch(`${API_URL}/session-visit/${state.currentVisitIndex}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to load visit');
        }
        
        state.currentVisit = data.visit;
        
        // Update progress
        elements.progressText.textContent = `Photo Review ${state.currentVisitIndex + 1}/${state.totalVisits}`;
        
        // Render photos
        renderPhotos(data.visit.photos);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function renderPhotos(photos) {
    elements.photoContainer.innerHTML = '';
    
    photos.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'photo-item';
        
        if (photo.error) {
            div.innerHTML = `<div class="photo-error">${photo.error}</div>`;
        } else if (photo.image_data) {
            const img = document.createElement('img');
            img.src = photo.image_data;
            img.alt = photo.filename;
            div.appendChild(img);
        }
        
        elements.photoContainer.appendChild(div);
    });
}

async function recordAndNext(bucket) {
    showLoading('Recording result...');
    
    try {
        const response = await fetch(`${API_URL}/record-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visit_index: state.currentVisitIndex,
                bucket: bucket,
                reviewer_name: state.reviewerName
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Failed to record result');
        }
        
        if (data.is_complete) {
            // Review is complete
            await handleReviewComplete();
        } else {
            // Move to next visit
            state.currentVisitIndex++;
            await loadCurrentVisit();
        }
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function handleReviewComplete() {
    hideLoading();
    
    if (!confirm('Review complete! Do you want to save the results?')) {
        backToConfig();
        return;
    }
    
    showLoading('Exporting results...');
    
    try {
        // Get results from backend
        const response = await fetch(`${API_URL}/export-results`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('Failed to get results');
        }
        
        // Ask user where to save
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toTimeString().split(' ')[0].replace(/:/g, '');
        const defaultPath = `review_results_${timestamp}.csv`;
        
        const savePath = await ipcRenderer.invoke('save-file', {
            defaultPath: defaultPath,
            filters: [
                { name: 'CSV Files', extensions: ['csv'] }
            ]
        });
        
        if (savePath) {
            // Convert results to CSV
            const csv = resultsToCSV(data.results);
            
            // Write file
            fs.writeFileSync(savePath, csv, 'utf-8');
            
            alert(`Results saved to ${savePath}`);
        }
        
        backToConfig();
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function resultsToCSV(results) {
    const headers = ['form_id', 'user_id', 'reviewer', 'bucket', 'is_known_bad', 'date_reviewed'];
    const rows = [headers.join(',')];
    
    results.forEach(result => {
        const row = headers.map(h => {
            const value = result[h] || '';
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
        });
        rows.push(row.join(','));
    });
    
    return rows.join('\n');
}

function backToConfig() {
    elements.reviewScreen.style.display = 'none';
    elements.configScreen.style.display = 'block';
    
    // Clear review state
    state.currentVisitIndex = 0;
    state.currentVisit = null;
    elements.photoContainer.innerHTML = '';
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();
        
        if (settings.reviewer_name) {
            elements.reviewerName.value = settings.reviewer_name;
            state.reviewerName = settings.reviewer_name;
        }
        
        if (settings.last_directory) {
            elements.localDirectory.value = settings.last_directory;
            state.localDirectory = settings.last_directory;
        }
        
        if (settings.api_file) {
            elements.apiFile.value = settings.api_file;
            state.apiFile = settings.api_file;
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

async function saveSettings() {
    try {
        await fetch(`${API_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reviewer_name: state.reviewerName || elements.reviewerName.value.trim(),
                last_directory: state.localDirectory || elements.localDirectory.value.trim(),
                api_file: state.apiFile || elements.apiFile.value.trim()
            })
        });
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

// UI Helper functions
function showLoading(message) {
    elements.loadingText.innerHTML = message;
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function showSuccess(message) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = 'status-message success';
}

function showWarning(message) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = 'status-message warning';
}

function showError(message) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = 'status-message error';
    alert(message);
}

// Initialize the app
init();
