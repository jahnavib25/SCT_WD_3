/**
 * ==========================================================================
 * TIC-TAC-TOE GAME ENGINE
 * Vanilla JavaScript (ES6+), Premium Aesthetics, Minimax AI & Web Audio API
 * ==========================================================================
 */
// --- Global State ---
let boardState = Array(9).fill(null);
let currentPlayer = 'X'; // 'X' always starts
let gameActive = false;
let gameMode = 'pvp'; // 'pvp' or 'pvc'
let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard'
let undoStack = []; // Stack of { board: Array(9), player: String, cellsHistory: Array }
// Persistent Score & Stats
let stats = {
    xWins: 0,
    oWins: 0,
    compWins: 0,
    draws: 0,
    totalGames: 0,
    winPercent: 0
};
// Settings
let soundMuted = false;
let currentTheme = 'dark'; // 'dark' or 'light'
// Audio Context (Synthesized Audio Fallback)
let audioCtx = null;
// Confetti Particle Settings
let confettiActive = false;
let confettiParticles = [];
const confettiColors = ['#00f2fe', '#f35588', '#6366f1', '#ffb86c', '#50fa7b'];
// --- DOM Elements ---
let cells = [];
let statusBadge = null;
let statusText = null;
let historyList = null;
let undoBtn = null;
let resetBtn = null;
let confettiCanvas = null;
let confettiCtx = null;
// Modal Elements
let modalBackdrop = null;
let modalIcon = null;
let modalTitle = null;
let modalSubtitle = null;
let modalActionBtn = null;
// Stat Display Elements
let statTotalGames = null;
let statXWins = null;
let statOWins = null;
let statCompWins = null;
let statDraws = null;
let statWinPercent = null;
// Scoreboard Elements
let scoreXVal = null;
let scoreOVal = null;
let scoreDrawVal = null;
// Difficulty selection Container
let difficultyContainer = null;
// --- Initialize Application ---
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    loadSettingsAndStats();
    setupEventListeners();
    applyTheme();
    applyMuteButtonUI();
    updateScoresAndStatsUI();
    initConfettiCanvas();
});
/**
 * Grabs all necessary elements from the DOM and binds them to variables
 */
function initializeDOMElements() {
    // Screens
    cells = Array.from(document.querySelectorAll('.cell'));
    statusBadge = document.getElementById('status-badge');
    statusText = document.getElementById('status-text');
    historyList = document.getElementById('history-list');
    undoBtn = document.getElementById('btn-undo');
    resetBtn = document.getElementById('btn-reset');
    confettiCanvas = document.getElementById('confetti-canvas');
    difficultyContainer = document.getElementById('difficulty-container');
    // Modals
    modalBackdrop = document.getElementById('modal-backdrop');
    modalIcon = document.getElementById('modal-icon');
    modalTitle = document.getElementById('modal-title');
    modalSubtitle = document.getElementById('modal-subtitle');
    modalActionBtn = document.getElementById('modal-action-btn');
    // Statistics
    statTotalGames = document.getElementById('stat-total-games');
    statXWins = document.getElementById('stat-x-wins');
    statOWins = document.getElementById('stat-o-wins');
    statCompWins = document.getElementById('stat-comp-wins');
    statDraws = document.getElementById('stat-draws');
    statWinPercent = document.getElementById('stat-win-percent');
    // Scoreboard
    scoreXVal = document.getElementById('score-x-val');
    scoreOVal = document.getElementById('score-o-val');
    scoreDrawVal = document.getElementById('score-draw-val');
}
/**
 * Binds browser event listeners to elements
 */
function setupEventListeners() {
    // Theme and Audio Toggles
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('sound-toggle').addEventListener('click', toggleSound);
    // Home Screen Setup Controls
    const modeCards = document.querySelectorAll('.mode-selectors .selector-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            modeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const selectedMode = card.getAttribute('data-mode');
            gameMode = selectedMode;
            if (selectedMode === 'pvc') {
                difficultyContainer.classList.add('visible');
            } else {
                difficultyContainer.classList.remove('visible');
            }
            playClickSound();
        });
    });
    const diffButtons = document.querySelectorAll('.difficulty-options .diff-btn');
    diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            diffButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            aiDifficulty = btn.getAttribute('data-diff');
            playClickSound();
        });
    });
    document.getElementById('btn-start-game').addEventListener('click', startGame);
    // Game Board Controls
    cells.forEach((cell, idx) => {
        cell.addEventListener('click', () => handleCellClick(idx));
        cell.addEventListener('keydown', (e) => handleCellKeyboard(e, idx));
    });
    undoBtn.addEventListener('click', undoLastMove);
    resetBtn.addEventListener('click', restartGame);
    document.getElementById('btn-new-match').addEventListener('click', showHomeScreen);
    document.getElementById('btn-reset-stats').addEventListener('click', resetStatistics);
    // Modal Actions
    modalActionBtn.addEventListener('click', () => {
        closeModal();
        restartGame();
    });
    document.getElementById('modal-home-btn').addEventListener('click', () => {
        closeModal();
        showHomeScreen();
    });
    // Canvas Resize Listener
    window.addEventListener('resize', resizeConfettiCanvas);
}
// ==========================================================================
// STATE MANAGEMENT & LOCAL STORAGE
// ==========================================================================
/**
 * Loads user configuration and statistics from localStorage
 */
function loadSettingsAndStats() {
    // Load Theme
    const savedTheme = localStorage.getItem('ttt_theme');
    if (savedTheme) {
        currentTheme = savedTheme;
    } else {
        // Media query check
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme = prefersDark ? 'dark' : 'light';
    }
    // Load Sound Setting
    const savedMute = localStorage.getItem('ttt_muted');
    if (savedMute !== null) {
        soundMuted = (savedMute === 'true');
    }
    // Load Stats
    const savedStats = localStorage.getItem('ttt_stats');
    if (savedStats) {
        try {
            stats = JSON.parse(savedStats);
        } catch (e) {
            console.error("Failed to parse scores from LocalStorage, resetting.", e);
        }
    }
}
/**
 * Saves current configuration and stats to localStorage
 */
function saveSettingsAndStats() {
    localStorage.setItem('ttt_theme', currentTheme);
    localStorage.setItem('ttt_muted', soundMuted.toString());
    localStorage.setItem('ttt_stats', JSON.stringify(stats));
}
/**
 * Clears statistics and scores in storage
 */
function resetStatistics() {
    if (confirm("Are you sure you want to reset all game statistics and scoreboard values?")) {
        stats = {
            xWins: 0,
            oWins: 0,
            compWins: 0,
            draws: 0,
            totalGames: 0,
            winPercent: 0
        };
        saveSettingsAndStats();
        updateScoresAndStatsUI();
        playSynthSound('restart');
    }
}
// ==========================================================================
// AUDIO SYNTHESIS SYSTEM (Web Audio API)
// ==========================================================================
/**
 * Lazy initializer for AudioContext
 */
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}
/**
 * Synthesizes high fidelity sound effects programmatically
 * @param {String} type - Sound effect key ('click', 'win', 'draw', 'restart')
 */
function playSynthSound(type) {
    if (soundMuted) return;

    try {
        const ctx = getAudioContext();
        const destination = ctx.destination;
        if (type === 'click') {
            // Short click pop
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
            gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gainNode);
            gainNode.connect(destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);

        } else if (type === 'win') {
            // Uplifting arpeggio in C-major
            const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            freqs.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.09);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime + index * 0.09);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime + index * 0.09 + 0.12);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.09 + 0.3);
                osc.connect(gainNode);
                gainNode.connect(destination);
                osc.start(ctx.currentTime + index * 0.09);
                osc.stop(ctx.currentTime + index * 0.09 + 0.35);
            });

        } else if (type === 'draw') {
            // Low neutral chord descending
            const freqs = [311.13, 293.66, 233.08]; // Eb4, D4, Bb3
            freqs.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);
                gainNode.gain.setValueAtTime(0.08, ctx.currentTime + index * 0.12);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.28);
                osc.connect(gainNode);
                gainNode.connect(destination);
                osc.start(ctx.currentTime + index * 0.12);
                osc.stop(ctx.currentTime + index * 0.12 + 0.32);
            });

        } else if (type === 'restart') {
            // Swoop upward
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.22);
            gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc.connect(gainNode);
            gainNode.connect(destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.22);
        }
    } catch (err) {
        console.warn("AudioContext failed to trigger:", err);
    }
}
/** Wrapper for click sound to trigger early user context if needed */
function playClickSound() {
    playSynthSound('click');
}
/**
 * Toggles audio mute state
 */
function toggleSound() {
    soundMuted = !soundMuted;
    saveSettingsAndStats();
    applyMuteButtonUI();

    if (!soundMuted) {
        // Quick feedback click to confirm sound is active
        playClickSound();
    }
}
/**
 * Updates sound speaker icon based on current mute state
 */
function applyMuteButtonUI() {
    const toggleBtn = document.getElementById('sound-toggle');
    if (soundMuted) {
        toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
      </svg>
    `;
        toggleBtn.setAttribute('aria-label', 'Unmute game sounds');
    } else {
        toggleBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
    `;
        toggleBtn.setAttribute('aria-label', 'Mute game sounds');
    }
}
// ==========================================================================
// THEME toggling SYSTEM
// ==========================================================================
/**
 * Toggles color theme between Dark/Light mode
 */
function toggleTheme() {
    currentTheme = (currentTheme === 'dark') ? 'light' : 'dark';
    saveSettingsAndStats();
    applyTheme();
    playClickSound();
}
/**
 * Applies CSS class representing the active theme to body
 */
function applyTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (currentTheme === 'light') {
        document.body.classList.add('light');
        toggleBtn.textContent = '☀️';
        toggleBtn.setAttribute('aria-label', 'Switch to dark theme');
    } else {
        document.body.classList.remove('light');
        toggleBtn.textContent = '🌙';
        toggleBtn.setAttribute('aria-label', 'Switch to light theme');
    }
}
// ==========================================================================
// GAME SYSTEM LOGIC
// ==========================================================================
/**
 * Triggers transition from setup screen to board gameplay
 */
function startGame() {
    document.getElementById('screen-setup').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');

    // Set UI Headers depending on selected game mode
    const opponentLabel = document.getElementById('opponent-label');
    if (gameMode === 'pvc') {
        const diffText = aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1);
        opponentLabel.textContent = `Computer (${diffText})`;
    } else {
        opponentLabel.textContent = 'Local Player O';
    }
    playSynthSound('restart');
    restartGame();
}
/**
 * Triggers transition back to home configuration screen
 */
function showHomeScreen() {
    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('screen-setup').classList.remove('hidden');
    playClickSound();
    gameActive = false;
    stopConfetti();
}
/**
 * Resets board grid, undo history, active player, and restarts gameplay
 */
function restartGame() {
    boardState = Array(9).fill(null);
    currentPlayer = 'X';
    gameActive = true;
    undoStack = [];

    // Clear Grid Cells UI
    cells.forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell';
        cell.disabled = false;
        cell.removeAttribute('style');
        // Set cell hover placeholder styling properties
        cell.setAttribute('style', '--hover-placeholder: "X"');
        cell.classList.add('hover-x');
    });
    // Reset Control UI Buttons
    undoBtn.disabled = true;
    historyList.innerHTML = `<div class="history-empty" id="history-empty">No moves made yet. Take a turn!</div>`;
    stopConfetti();
    updateTurnIndicator();
    playSynthSound('restart');
}
/**
 * Grid selection click handler
 * @param {Number} index - Position on the grid (0-8)
 */
function handleCellClick(index) {
    // Reject moves if game is inactive or cell is already selected
    if (!gameActive || boardState[index] !== null) return;
    // Process human move
    makeMove(index, currentPlayer);
    // If game is still running, handle computer turn in PVC mode
    if (gameActive && gameMode === 'pvc') {
        // Temporarily lock cells so user cannot double-click before AI computes
        setCellsInteractivity(false);

        // Slight delay (450ms) to give a natural feeling of AI deliberation
        setTimeout(() => {
            if (!gameActive || currentPlayer !== 'O') return; // Prevent AI action if user restarted/reset turn
            const aiMoveIndex = getComputerMove();
            makeMove(aiMoveIndex, 'O');
            setCellsInteractivity(true);
        }, 450);
    }
}
/**
 * Toggles all board buttons clickable/non-clickable (useful during AI turns)
 * @param {Boolean} interactive - Interactive state
 */
function setCellsInteractivity(interactive) {
    cells.forEach((cell, idx) => {
        if (boardState[idx] === null) {
            cell.disabled = !interactive;
        }
    });
}
/**
 * Commits a move to the board and updates UI state
 * @param {Number} index - Cell index
 * @param {String} player - 'X' or 'O'
 */
function makeMove(index, player) {
    // Push copy of previous state to undo stack (only applicable for PVP, though we trace it for history too)
    undoStack.push({
        board: [...boardState],
        player: player,
        index: index
    });

    // Update board
    boardState[index] = player;

    // Update cell UI
    const cell = cells[index];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
    cell.disabled = true;
    cell.classList.remove('hover-x', 'hover-o');
    cell.removeAttribute('style');
    playClickSound();
    appendMoveToHistoryList(player, index);
    // Enable undo button only for PvP mode, and if there are moves to undo
    undoBtn.disabled = (gameMode === 'pvc' || undoStack.length === 0);
    // Check Game Ending States
    const winCombination = checkWinCondition(boardState, player);
    if (winCombination) {
        handleGameVictory(player, winCombination);
        return;
    }
    if (checkDrawCondition(boardState)) {
        handleGameDraw();
        return;
    }
    // Swap Active Turn
    currentPlayer = (player === 'X') ? 'O' : 'X';
    updateTurnIndicator();
}
/**
 * Updates Turn display indicator badge text
 */
function updateTurnIndicator() {
    statusBadge.className = `status-badge ${currentPlayer.toLowerCase()}`;
    statusBadge.textContent = currentPlayer;

    let labelText = '';
    if (gameMode === 'pvc') {
        labelText = (currentPlayer === 'X') ? 'Your Turn' : "Computer's Turn";
    } else {
        labelText = `Player ${currentPlayer}'s Turn`;
    }
    statusText.textContent = labelText;
    // Update hover placeholders on empty cells
    cells.forEach((cell, idx) => {
        if (boardState[idx] === null) {
            cell.classList.remove('hover-x', 'hover-o');
            cell.classList.add(`hover-${currentPlayer.toLowerCase()}`);
            cell.style.setProperty('--hover-placeholder', `"${currentPlayer}"`);
        }
    });
}
/**
 * Appends details card of the move to the history tracking panel
 * @param {String} player - 'X' or 'O'
 * @param {Number} index - Grid location index
 */
function appendMoveToHistoryList(player, index) {
    const emptyHint = document.getElementById('history-empty');
    if (emptyHint) {
        emptyHint.remove();
    }
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    const moveNumber = undoStack.length;
    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('data-move-index', index);
    item.innerHTML = `
    <span class="history-player ${player.toLowerCase()}">${player} <span style="font-weight:400;color:var(--text-muted)">Move #${moveNumber}</span></span>
    <span class="history-cell-info">Cell (Row ${row}, Col ${col})</span>
  `;
    // Prepend to show newest at the top
    historyList.insertBefore(item, historyList.firstChild);
}
/**
 * Reverts the board grid to the previous move state. PvP Only.
 */
function undoLastMove() {
    if (gameMode === 'pvc') return; // Restrict Undo to PVP as requested
    if (undoStack.length === 0) return;
    const lastState = undoStack.pop();
    boardState = lastState.board;
    currentPlayer = lastState.player;
    gameActive = true;
    // Synchronize Board cells UI
    cells.forEach((cell, idx) => {
        const val = boardState[idx];
        cell.textContent = val || '';
        cell.className = 'cell';
        cell.disabled = (val !== null);
        cell.removeAttribute('style');
    });
    // Re-enable/disable Undo button
    undoBtn.disabled = (undoStack.length === 0);
    // Remove newest item from history list
    if (historyList.firstChild) {
        historyList.firstChild.remove();
    }
    if (undoStack.length === 0) {
        historyList.innerHTML = `<div class="history-empty" id="history-empty">No moves made yet. Take a turn!</div>`;
    }
    updateTurnIndicator();
    playClickSound();
}
// ==========================================================================
// WIN & DRAW CHECKERS
// ==========================================================================
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];
/**
 * Checks if the board array contains a winning arrangement for a player
 * @param {Array} board - Board grid representation
 * @param {String} player - 'X' or 'O'
 * @returns {Array|null} Array of indices of the winning line, or null
 */
function checkWinCondition(board, player) {
    for (let combo of WINNING_COMBINATIONS) {
        if (board[combo[0]] === player && board[combo[1]] === player && board[combo[2]] === player) {
            return combo;
        }
    }
    return null;
}
/**
 * Checks if the board has been filled with no win conditions met
 * @param {Array} board - Board grid representation
 * @returns {Boolean}
 */
function checkDrawCondition(board) {
    return board.every(cell => cell !== null);
}
/**
 * Triggers victory sequences
 * @param {String} winner - 'X' or 'O'
 * @param {Array} combo - Indices of winning cells
 */
function handleGameVictory(winner, combo) {
    gameActive = false;
    undoBtn.disabled = true;
    // Highlight winning cell combinations
    combo.forEach(idx => {
        cells[idx].classList.add('winning');
    });
    // Update Stats & Scores
    stats.totalGames++;
    if (gameMode === 'pvp') {
        if (winner === 'X') {
            stats.xWins++;
        } else {
            stats.oWins++;
        }
    } else {
        // PVC mode
        if (winner === 'X') {
            stats.xWins++; // Player win
        } else {
            stats.compWins++; // Computer win
        }
    }
    recalculateWinPercentage();
    saveSettingsAndStats();
    updateScoresAndStatsUI();
    // Trigger win sounds and confetti
    playSynthSound('win');
    startConfetti();
    // Launch Victory Modal with slight delay
    setTimeout(() => {
        displayGameOverModal(winner);
    }, 1000);
}
/**
 * Triggers draw sequences
 */
function handleGameDraw() {
    gameActive = false;
    undoBtn.disabled = true;
    // Update Stats & Scores
    stats.totalGames++;
    stats.draws++;
    recalculateWinPercentage();
    saveSettingsAndStats();
    updateScoresAndStatsUI();
    playSynthSound('draw');
    // Launch Draw Modal
    setTimeout(() => {
        displayGameOverModal('draw');
    }, 600);
}
/** Computes player X's win percentage relative to games played */
function recalculateWinPercentage() {
    if (stats.totalGames === 0) {
        stats.winPercent = 0;
    } else {
        stats.winPercent = Math.round((stats.xWins / stats.totalGames) * 100);
    }
}
/**
 * Updates scores values in scoreboard panels and statistics grid UI
 */
function updateScoresAndStatsUI() {
    // Scoreboard
    scoreXVal.textContent = stats.xWins;
    scoreDrawVal.textContent = stats.draws;
    if (gameMode === 'pvc') {
        scoreOVal.textContent = stats.compWins;
        document.getElementById('score-o-title').textContent = 'COMP (O)';
    } else {
        scoreOVal.textContent = stats.oWins;
        document.getElementById('score-o-title').textContent = 'PLAYER O';
    }
    // Detailed Statistics panel
    statTotalGames.textContent = stats.totalGames;
    statXWins.textContent = stats.xWins;
    statOWins.textContent = stats.oWins;
    statCompWins.textContent = stats.compWins;
    statDraws.textContent = stats.draws;
    statWinPercent.textContent = `${stats.winPercent}%`;
}
// ==========================================================================
// COMPUTER MODE - INTELLIGENT AI (Easy, Medium, Hard/Minimax)
// ==========================================================================
/**
 * Evaluates game state and retrieves next computer move
 * @returns {Number} Index on board grid
 */
function getComputerMove() {
    const emptyIndices = boardState
        .map((val, idx) => val === null ? idx : null)
        .filter(val => val !== null);
    if (emptyIndices.length === 0) return -1;
    if (aiDifficulty === 'easy') {
        // --- EASY MODE: Random Move ---
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

    } else if (aiDifficulty === 'medium') {
        // --- MEDIUM MODE: Block obvious wins or win if possible, else random ---

        // 1. Can AI Win right now? (Checks O's next move)
        for (let index of emptyIndices) {
            const testBoard = [...boardState];
            testBoard[index] = 'O';
            if (checkWinCondition(testBoard, 'O')) {
                return index;
            }
        }
        // 2. Can Player Win right now? Block X.
        for (let index of emptyIndices) {
            const testBoard = [...boardState];
            testBoard[index] = 'X';
            if (checkWinCondition(testBoard, 'X')) {
                return index;
            }
        }
        // 3. Fallback to center grid cell if open (strategic position)
        if (boardState[4] === null) {
            return 4;
        }
        // 4. Random from remaining choices
        return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

    } else {
        // --- HARD MODE: Mathematical Minimax (Unbeatable) ---
        return getMinimaxBestMove();
    }
}
/**
 * Minimax selector for Hard AI
 * @returns {Number} Index of optimal move
 */
function getMinimaxBestMove() {
    let bestScore = -Infinity;
    let move = -1;
    // Loop through available spots
    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i] === null) {
            // Simulate move
            boardState[i] = 'O';
            let score = minimax(boardState, 0, false);
            // Undo simulation
            boardState[i] = null;
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}
/**
 * Standard Minimax utility scorer
 * @param {Array} board - Board grid representation
 * @param {Number} depth - Recursion depth
 * @param {Boolean} isMaximizing - Active node type (Maximizer O, Minimizer X)
 * @returns {Number} Utility score
 */
function minimax(board, depth, isMaximizing) {
    // Check Base Terminal States
    if (checkWinCondition(board, 'O')) return 10 - depth; // Win
    if (checkWinCondition(board, 'X')) return depth - 10; // Lose
    if (checkDrawCondition(board)) return 0; // Draw
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
                board[i] = 'O';
                let score = minimax(board, depth + 1, false);
                board[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
                board[i] = 'X';
                let score = minimax(board, depth + 1, true);
                board[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}
// ==========================================================================
// MODAL & CONGRATULATION UI ACTIONS
// ==========================================================================
/**
 * Mounts Game Over Modal content and sets visible classes
 * @param {String} winner - 'X', 'O', or 'draw'
 */
function displayGameOverModal(winner) {
    // Reset CSS modal classes
    modalIcon.className = 'modal-icon';

    if (winner === 'draw') {
        modalIcon.classList.add('draw-neutral');
        modalIcon.textContent = '🤝';
        modalTitle.textContent = "It's a Draw!";
        modalSubtitle.textContent = "A well-matched battle! Ready to break the tie?";
    } else {
        modalIcon.classList.add(`win-${winner.toLowerCase()}`);
        modalIcon.textContent = '🏆';

        if (gameMode === 'pvc') {
            if (winner === 'X') {
                modalTitle.textContent = "Victory!";
                modalSubtitle.textContent = "Outstanding! You defeated the computer.";
            } else {
                modalIcon.textContent = '🤖';
                modalTitle.textContent = "AI Victory";
                modalSubtitle.textContent = "The machine was victorious. Care to try again?";
            }
        } else {
            modalTitle.textContent = `Player ${winner} Wins!`;
            modalSubtitle.textContent = `Congratulations Player ${winner}, a stellar performance!`;
        }
    }
    modalBackdrop.classList.add('visible');
}
/**
 * Closes Game Over modal card
 */
function closeModal() {
    modalBackdrop.classList.remove('visible');
}
// ==========================================================================
// CONFETTI SYSTEM (HTML5 Canvas Particles)
// ==========================================================================
function initConfettiCanvas() {
    resizeConfettiCanvas();
}
function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
class ConfettiParticle {
    constructor() {
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight * 0.45; // Start burst around the center modal level

        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 8 + 4;

        this.vx = Math.cos(angle) * velocity;
        this.vy = Math.sin(angle) * velocity - 3; // Push slightly upward initially
        this.size = Math.random() * 6 + 6;
        this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        this.gravity = 0.25;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.opacity = 1;
        this.fade = Math.random() * 0.015 + 0.005;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98; // Drag
        this.rotation += this.rotationSpeed;
        this.opacity -= this.fade;
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        // Draw rectangular confetti piece
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
        ctx.restore();
    }
}
/**
 * Triggers frame drawing loop for confetti particles
 */
function startConfetti() {
    confettiCtx = confettiCanvas.getContext('2d');
    confettiParticles = [];
    confettiActive = true;

    // Seed initial particles burst
    for (let i = 0; i < 150; i++) {
        confettiParticles.push(new ConfettiParticle());
    }
    // Run animation
    requestAnimationFrame(animateConfetti);
}
/**
 * Main loop for drawing and updates on confetti canvas
 */
function animateConfetti() {
    if (!confettiActive) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        return;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    // Filter out completely faded particles
    confettiParticles = confettiParticles.filter(p => p.opacity > 0);
    // Draw and Update Remaining
    confettiParticles.forEach(p => {
        p.update();
        p.draw(confettiCtx);
    });
    // Slow trickle of extra particles from top if the burst is fading out
    if (confettiParticles.length < 40 && Math.random() < 0.2) {
        const trickle = new ConfettiParticle();
        trickle.y = -10; // Start off screen top
        trickle.x = Math.random() * window.innerWidth;
        trickle.vy = Math.random() * 3 + 1;
        trickle.vx = Math.random() * 2 - 1;
        confettiParticles.push(trickle);
    }
    requestAnimationFrame(animateConfetti);
}
/**
 * Terminates confetti animation loop
 */
function stopConfetti() {
    confettiActive = false;
    confettiParticles = [];
}
// ==========================================================================
// KEYBOARD NAVIGATION & ACCESSIBILITY
// ==========================================================================
/**
 * Keyboard listener on grid board to move focus via arrow keys
 * @param {KeyboardEvent} event - Key event
 * @param {Number} currentIndex - Cell index
 */
function handleCellKeyboard(event, currentIndex) {
    const key = event.key;
    let row = Math.floor(currentIndex / 3);
    let col = currentIndex % 3;
    switch (key) {
        case 'ArrowRight':
            col = (col + 1) % 3;
            break;
        case 'ArrowLeft':
            col = (col - 1 + 3) % 3;
            break;
        case 'ArrowDown':
            row = (row + 1) % 3;
            break;
        case 'ArrowUp':
            row = (row - 1 + 3) % 3;
            break;
        default:
            return; // Do nothing for other keys (Space/Enter will naturally click)
    }
    event.preventDefault(); // Stop default scroll behavior
    const nextIndex = row * 3 + col;
    cells[nextIndex].focus();
}