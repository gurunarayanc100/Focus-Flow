// App State & Constants
const STATE = {
    timeLeft: 20 * 60,
    currPreset: 20,
    isRunning: false,
    intervalId: null,
    totalTime: 20 * 60,
    sessions: [] // {id, name, duration(min), actualDuration(sec), status, timestamp}
};

// DOM Elements
const elements = {
    timeDisplay: document.getElementById('time-display'),
    progressRing: document.querySelector('.progress-ring__circle'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    stopBtn: document.getElementById('stop-btn'),
    resetBtn: document.getElementById('reset-btn'),
    sessionInput: document.getElementById('session-name'),
    presetBtns: document.querySelectorAll('.preset-btn'),
    navBtns: document.querySelectorAll('.nav-btn'),
    views: document.querySelectorAll('.view'),
    historyList: document.getElementById('history-list'),
    stats: {
        totalSessions: document.getElementById('total-sessions'),
        totalTime: document.getElementById('total-time'),
        todaySessions: document.getElementById('today-sessions')
    },
    audio: document.getElementById('alarm-sound'),
    modal: {
        overlay: document.getElementById('completion-modal'),
        completeBtn: document.getElementById('modal-complete-btn'),
        incompleteBtn: document.getElementById('modal-incomplete-btn'),
        cancelBtn: document.getElementById('modal-cancel-btn')
    }
};

// Circle Constants
const radius = elements.progressRing.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

// Initialization
function init() {
    elements.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    elements.progressRing.style.strokeDashoffset = 0;
    loadData();
    setupEventListeners();
    updateTimerDisplay();
    updateDashboard();
}

function setupEventListeners() {
    elements.startBtn.addEventListener('click', startTimer);
    elements.pauseBtn.addEventListener('click', pauseTimer);
    elements.stopBtn.addEventListener('click', stopTimerHandler); // New Handler
    elements.resetBtn.addEventListener('click', resetTimer);

    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (STATE.isRunning) return;
            elements.presetBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const min = parseInt(e.target.dataset.time);
            setTimer(min);
        });
    });

    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.id === 'btn-timer' ? 'timer-view' : 'dashboard-view';
            switchView(targetId);
            elements.navBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Modal Listeners
    elements.modal.completeBtn.addEventListener('click', () => finalizeSession('Completed'));
    elements.modal.incompleteBtn.addEventListener('click', () => finalizeSession('Incomplete'));
    elements.modal.cancelBtn.addEventListener('click', closeModal);

    // History List Delegation for Delete
    elements.historyList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = parseInt(deleteBtn.dataset.id);
            deleteSession(id);
        }
    });
}

function deleteSession(id) {
    if (confirm('Are you sure you want to delete this session?')) {
        STATE.sessions = STATE.sessions.filter(s => s.id !== id);
        localStorage.setItem('pomodoro_sessions', JSON.stringify(STATE.sessions));
        updateDashboard();
    }
}

function setTimer(minutes) {
    STATE.currPreset = minutes;
    STATE.totalTime = minutes * 60;
    STATE.timeLeft = STATE.totalTime;
    updateTimerDisplay();
    setProgress(100);
}

function updateTimerDisplay() {
    const minutes = Math.floor(STATE.timeLeft / 60);
    const seconds = STATE.timeLeft % 60;
    elements.timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    elements.progressRing.style.strokeDashoffset = offset;
}

function startTimer() {
    if (STATE.isRunning) return;

    const sessionName = elements.sessionInput.value.trim();
    if (!sessionName) {
        alert('Please enter a session name to start focusing.');
        elements.sessionInput.classList.add('input-error');
        elements.sessionInput.focus();
        return;
    }
    elements.sessionInput.classList.remove('input-error');

    STATE.isRunning = true;
    toggleControls(true); // Shows Pause & Stop

    STATE.intervalId = setInterval(() => {
        if (STATE.timeLeft > 0) {
            STATE.timeLeft--;
            updateTimerDisplay();
            const percent = (STATE.timeLeft / STATE.totalTime) * 100;
            setProgress(percent);
        } else {
            // Natural Finish
            finishTimer('Completed');
        }
    }, 1000);
}

function pauseTimer() {
    STATE.isRunning = false;
    clearInterval(STATE.intervalId);
    toggleControls(false); // Switch back to Start
}

function stopTimerHandler() {
    pauseTimer(); // Checkpoints time
    // Show Modal
    elements.modal.overlay.classList.remove('hidden');
}

function closeModal() {
    elements.modal.overlay.classList.add('hidden');
    // If we cancel, we stay paused. User can resume or reset.
}

function finalizeSession(status) {
    closeModal();
    finishTimer(status);
}

function finishTimer(status) {
    clearInterval(STATE.intervalId);
    STATE.isRunning = false;
    toggleControls(false); // Reset controls state

    if (status === 'Completed' && STATE.timeLeft === 0) {
        playAlarm();
    }

    // Calculate actual duration in seconds
    const elapsedSeconds = STATE.totalTime - STATE.timeLeft;
    // Special case: if completed naturally, elapsed is full time
    const finalDurationSeconds = (status === 'Completed' && STATE.timeLeft === 0) ? STATE.totalTime : elapsedSeconds;

    // Save Session
    const session = {
        id: Date.now(),
        name: elements.sessionInput.value.trim() || 'Focus Session',
        plannedDuration: STATE.currPreset, // minutes
        actualDuration: finalDurationSeconds, // seconds
        status: status, // 'Completed', 'Incomplete'
        timestamp: new Date().toISOString()
    };

    saveSession(session);

    // Reset UI
    elements.sessionInput.value = '';
    STATE.timeLeft = STATE.totalTime;
    updateTimerDisplay();
    setProgress(100);
    elements.sessionInput.classList.remove('input-error');

    if (status === 'Completed' && STATE.timeLeft === 0) {
        alert('Session Completed! Great job!');
    }
}

function resetTimer() {
    pauseTimer();
    STATE.timeLeft = STATE.totalTime;
    updateTimerDisplay();
    setProgress(100);
    elements.sessionInput.classList.remove('input-error');
}

function toggleControls(isRunning) {
    if (isRunning) {
        elements.startBtn.classList.add('hidden');
        elements.pauseBtn.classList.remove('hidden');
        elements.stopBtn.classList.remove('hidden'); // Show Stop
        elements.presetBtns.forEach(b => b.disabled = true);
    } else {
        elements.startBtn.classList.remove('hidden');
        elements.pauseBtn.classList.add('hidden');
        elements.stopBtn.classList.add('hidden'); // Hide Stop
        elements.presetBtns.forEach(b => b.disabled = false);
    }
}

function playAlarm() {
    elements.audio.play().catch(e => console.log('Audio play failed', e));
}

function switchView(viewId) {
    elements.views.forEach(view => {
        if (view.id === viewId) {
            view.classList.remove('hidden');
            setTimeout(() => view.style.opacity = 1, 10);
        } else {
            view.style.opacity = 0;
            setTimeout(() => view.classList.add('hidden'), 300);
        }
    });
    if (viewId === 'dashboard-view') updateDashboard();
}

// Data Persistence
function loadData() {
    const stored = localStorage.getItem('pomodoro_sessions');
    if (stored) STATE.sessions = JSON.parse(stored);
}

function saveSession(session) {
    STATE.sessions.unshift(session);
    localStorage.setItem('pomodoro_sessions', JSON.stringify(STATE.sessions));
    updateDashboard();
}

function updateDashboard() {
    elements.stats.totalSessions.textContent = STATE.sessions.length;

    // Sum actual duration in seconds
    const totalSeconds = STATE.sessions.reduce((acc, curr) => {
        // Fallback for old data structure if any (curr.duration in min)
        const seconds = curr.actualDuration !== undefined ? curr.actualDuration : (curr.duration * 60);
        return acc + seconds;
    }, 0);

    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    elements.stats.totalTime.textContent = `${hours}h ${mins}m`;

    const today = new Date().toDateString();
    const todayCount = STATE.sessions.filter(s => new Date(s.timestamp).toDateString() === today).length;
    elements.stats.todaySessions.textContent = todayCount;

    elements.historyList.innerHTML = '';
    if (STATE.sessions.length === 0) {
        elements.historyList.innerHTML = '<div class="empty-state">No sessions yet. Start focusing!</div>';
        return;
    }

    STATE.sessions.forEach(session => {
        const date = new Date(session.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Handle new vs old data structure safely
        const durationSec = session.actualDuration !== undefined ? session.actualDuration : (session.duration * 60);
        const durationMin = Math.floor(durationSec / 60);
        const durationDisplay = durationSec < 60 ? `${durationSec}s` : `${durationMin}m`;

        const status = session.status || 'Completed'; // Default for old data
        const statusClass = status === 'Completed' ? 'status-completed' : 'status-incomplete';

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="history-name">${session.name}</div>
                <div class="history-date">${dateStr}</div>
            </div>
            <div class="history-right">
                <div style="text-align: right;">
                    <span class="status-badge ${statusClass}">${status}</span>
                    <div class="history-duration">${durationDisplay}</div>
                </div>
                <button class="delete-btn" data-id="${session.id}" title="Delete Session">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        elements.historyList.appendChild(item);
    });
}

init();
