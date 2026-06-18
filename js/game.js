// ============================================
// Podiadle — Shared Game Logic
// ============================================

const MAX_GUESSES = 6;

// Game state — set by page-specific init
let currentWord = null;
let currentGuess = "";
let guesses = [];
let gameOver = false;
let hintUsed = false;

// ============================================
// BOARD
// ============================================

function createBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';

    const wordLength = currentWord.word.length;

    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = document.createElement('div');
        row.className = 'board-row';
        row.id = `row-${i}`;

        for (let j = 0; j < wordLength; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }

        board.appendChild(row);
    }
}

function updateBoard() {
    const wordLength = currentWord.word.length;

    // Update guessed rows
    guesses.forEach((guess, rowIndex) => {
        const result = checkGuess(guess);
        for (let i = 0; i < wordLength; i++) {
            const tile = document.getElementById(`tile-${rowIndex}-${i}`);
            tile.textContent = guess[i];
            tile.className = `tile ${result[i]}`;
            tile.style.animationDelay = `${i * 0.1}s`;
        }
    });

    // Update current row
    if (!gameOver && guesses.length < MAX_GUESSES) {
        const currentRowIndex = guesses.length;
        for (let i = 0; i < wordLength; i++) {
            const tile = document.getElementById(`tile-${currentRowIndex}-${i}`);
            tile.textContent = currentGuess[i] || '';
            tile.className = currentGuess[i] ? 'tile filled' : 'tile';
        }
    }
}

// ============================================
// KEYBOARD
// ============================================

function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';

    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';

        row.forEach(key => {
            const button = document.createElement('button');
            button.className = 'key';
            button.textContent = key;
            button.id = `key-${key}`;
            button.setAttribute('aria-label', key === '⌫' ? 'Backspace' : key === 'ENTER' ? 'Enter' : key);

            if (key === 'ENTER' || key === '⌫') {
                button.classList.add('wide');
            }

            button.addEventListener('click', () => handleKeyPress(key));
            rowDiv.appendChild(button);
        });

        keyboard.appendChild(rowDiv);
    });
}

function updateKeyboard() {
    const letterStatus = {};

    guesses.forEach(guess => {
        const result = checkGuess(guess);
        for (let i = 0; i < guess.length; i++) {
            const letter = guess[i];
            const status = result[i];

            // Priority: correct > present > absent
            if (status === 'correct') {
                letterStatus[letter] = 'correct';
            } else if (status === 'present' && letterStatus[letter] !== 'correct') {
                letterStatus[letter] = 'present';
            } else if (status === 'absent' && !letterStatus[letter]) {
                letterStatus[letter] = 'absent';
            }
        }
    });

    Object.keys(letterStatus).forEach(letter => {
        const key = document.getElementById(`key-${letter}`);
        if (key) {
            key.className = `key ${letterStatus[letter]}`;
        }
    });
}

// ============================================
// GAME LOGIC
// ============================================

function checkGuess(guess) {
    const target = currentWord.word.toUpperCase();
    const result = new Array(target.length).fill('absent');
    const targetLetters = target.split('');
    const guessLetters = guess.toUpperCase().split('');

    // First pass: find correct letters
    guessLetters.forEach((letter, i) => {
        if (letter === targetLetters[i]) {
            result[i] = 'correct';
            targetLetters[i] = null;
        }
    });

    // Second pass: find present letters
    guessLetters.forEach((letter, i) => {
        if (result[i] !== 'correct') {
            const index = targetLetters.indexOf(letter);
            if (index !== -1) {
                result[i] = 'present';
                targetLetters[index] = null;
            }
        }
    });

    return result;
}

function handleKeyPress(key) {
    if (gameOver) return;

    const wordLength = currentWord.word.length;

    if (key === 'ENTER') {
        submitGuess();
    } else if (key === '⌫') {
        currentGuess = currentGuess.slice(0, -1);
        updateBoard();
    } else if (currentGuess.length < wordLength) {
        currentGuess += key;
        updateBoard();
    }
}

function submitGuess() {
    const wordLength = currentWord.word.length;
    const maxGuesses = hintUsed ? MAX_GUESSES - 1 : MAX_GUESSES;

    if (currentGuess.length !== wordLength) {
        showMessage(`Guess must be ${wordLength} letters`);
        shakeCurrentRow();
        return;
    }

    guesses.push(currentGuess.toUpperCase());

    // Check win/lose
    if (currentGuess.toUpperCase() === currentWord.word.toUpperCase()) {
        gameOver = true;
        updateBoard();
        updateKeyboard();
        setTimeout(() => onGameEnd(true), 1500);
    } else if (guesses.length >= maxGuesses) {
        gameOver = true;
        updateBoard();
        updateKeyboard();
        setTimeout(() => onGameEnd(false), 1500);
    } else {
        updateBoard();
        updateKeyboard();
    }

    currentGuess = "";
    saveGameState();
}

function shakeCurrentRow() {
    const row = document.getElementById(`row-${guesses.length}`);
    row.classList.add('shake');
    setTimeout(() => row.classList.remove('shake'), 300);
}

// ============================================
// HINTS
// ============================================

function showHint() {
    if (gameOver) return;

    const hintDisplay = document.getElementById('hint-display');

    // If already used, just toggle visibility
    if (hintUsed) {
        hintDisplay.classList.toggle('visible');
        const isVisible = hintDisplay.classList.contains('visible');
        document.getElementById('hint-btn').innerHTML = getHintButtonHTML(isVisible);
        return;
    }

    // First time using hint — apply penalty
    hintUsed = true;

    // Grey out the last row to show penalty
    const lastRowIndex = MAX_GUESSES - 1;
    const wordLength = currentWord.word.length;
    for (let i = 0; i < wordLength; i++) {
        const tile = document.getElementById(`tile-${lastRowIndex}-${i}`);
        tile.style.opacity = '0.3';
        tile.style.borderStyle = 'dashed';
    }

    document.getElementById('hint-text').textContent = currentWord.hint;
    hintDisplay.classList.add('visible');
    document.getElementById('hint-btn').innerHTML = getHintButtonHTML(true);

    showMessage('Hint revealed! You now have 5 guesses.');
    saveGameState();
}

function hideHint() {
    document.getElementById('hint-display').classList.remove('visible');
    document.getElementById('hint-btn').innerHTML = getHintButtonHTML(false);
}

function getHintButtonHTML(isVisible) {
    if (isVisible) {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Hide Hint
        `;
    }
    return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Show Hint (-1 guess)
    `;
}

// ============================================
// MESSAGES & MODALS
// ============================================

function showMessage(text, duration) {
    duration = duration || 2000;
    const container = document.getElementById('message-container');
    const message = document.createElement('div');
    message.className = 'message';
    message.textContent = text;
    container.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, duration);
}

function showModal(type) {
    document.getElementById(`${type}-modal`).classList.add('visible');
    if (type === 'stats') {
        updateStatsDisplay();
    }
}

function hideModal(type) {
    document.getElementById(`${type}-modal`).classList.remove('visible');
    // Return focus to the game body
    document.body.focus();
}

// ============================================
// STATS DISPLAY
// ============================================

function updateStatsDisplay() {
    const stats = loadStats();
    if (!stats) return;

    document.getElementById('stat-played').textContent = stats.played;
    document.getElementById('stat-win-pct').textContent = stats.played > 0
        ? Math.round((stats.wins / stats.played) * 100)
        : 0;
    document.getElementById('stat-streak').textContent = stats.currentStreak;

    // Max streak element may not exist in event mode
    const maxStreakEl = document.getElementById('stat-max-streak');
    if (maxStreakEl) {
        maxStreakEl.textContent = stats.maxStreak;
    }

    // Visitors element may exist in event mode
    const visitorsEl = document.getElementById('stat-visitors');
    if (visitorsEl) {
        visitorsEl.textContent = stats.visitors || 0;
    }

    // Distribution bars
    const maxDist = Math.max(...stats.distribution, 1);
    const container = document.getElementById('distribution-bars');
    container.innerHTML = '';

    stats.distribution.forEach((count, i) => {
        const row = document.createElement('div');
        row.className = 'distribution-row';

        const label = document.createElement('span');
        label.className = 'distribution-label';
        label.textContent = i + 1;

        const bar = document.createElement('div');
        bar.className = 'distribution-bar';
        if (gameOver && guesses.length === i + 1 && guesses[guesses.length - 1] === currentWord.word.toUpperCase()) {
            bar.classList.add('highlight');
        }
        bar.style.width = `${(count / maxDist) * 100}%`;
        bar.textContent = count || '';

        row.appendChild(label);
        row.appendChild(bar);
        container.appendChild(row);
    });
}

// ============================================
// SHARE
// ============================================

function shareResults(prefix) {
    prefix = prefix || 'Podiadle';
    const won = guesses[guesses.length - 1] === currentWord.word.toUpperCase();
    const score = won ? guesses.length : 'X';

    let grid = '';
    guesses.forEach(guess => {
        const result = checkGuess(guess);
        result.forEach(status => {
            if (status === 'correct') grid += '🟩';
            else if (status === 'present') grid += '🟨';
            else grid += '⬛';
        });
        grid += '\n';
    });

    const text = `${prefix} ${score}/6\n\n${grid}\n#Podiadle #UoH #Podiatry`;

    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Copied to clipboard!');
        }).catch(() => {
            showMessage('Could not copy — try manually selecting the share text');
        });
    }
}

// ============================================
// KEYBOARD EVENTS
// ============================================

function setupKeyboardListener() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Don't capture keys when typing in form fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Enter') {
            handleKeyPress('ENTER');
        } else if (e.key === 'Backspace') {
            handleKeyPress('⌫');
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            handleKeyPress(e.key.toUpperCase());
        }
    });
}

function setupModalClosers() {
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('visible');
                document.body.focus();
            }
        });
    });

    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.visible').forEach(overlay => {
                overlay.classList.remove('visible');
            });
            document.body.focus();
        }
    });
}

// ============================================
// HOOKS — override per page
// ============================================

// Called when game ends (win or lose). Override per page.
function onGameEnd(won) {}

// Called to persist state. Override per page.
function saveGameState() {}

// Called to load stats. Override per page. Should return stats object or null.
function loadStats() {
    return null;
}