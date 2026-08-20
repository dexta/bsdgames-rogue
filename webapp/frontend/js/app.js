window.socket = io();
window.term = null;

let activeUser = null;
// Lade gespeicherte Schriftgröße oder setze Standard auf 18
let terminalFontSize = parseInt(localStorage.getItem('rogue_font_size')) || 18;

const screens = {
    login: document.getElementById('login-screen'),
    saves: document.getElementById('save-screen'),
    term: document.getElementById('terminal-container')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.style.display = 'none');
    screens[name].style.display = 'flex';
    if(name === 'term') screens[name].style.display = 'block';
}

// --- PROFIL & SAVE MANAGER ---
window.socket.emit('get-players');
window.socket.on('player-list', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = '';
    players.forEach(name => {
        const b = document.createElement('button');
        b.className = 'btn'; b.innerText = name;
        b.onclick = () => {
            activeUser = name;
            document.getElementById('current-user-display').innerText = name;
            showScreen('saves');
            window.socket.emit('get-saves', activeUser);
        };
        list.appendChild(b);
    });
});

document.getElementById('login-btn').onclick = () => {
    const name = document.getElementById('username-input').value.trim();
    if (name) {
        activeUser = name;
        document.getElementById('current-user-display').innerText = name;
        showScreen('saves');
        window.socket.emit('get-saves', activeUser);
    }
};

window.socket.on('save-list', ({ username, saves }) => {
    if (username !== activeUser) return;
    const list = document.getElementById('save-list');
    list.innerHTML = saves.length === 0 ? '<div class="save-item">Keine Saves gefunden.</div>' : '';
    
    saves.forEach(saveName => {
        list.innerHTML += `
            <div class="save-item">
                <span>${saveName}</span> 
                <div>
                    <button class="btn" style="padding:2px 6px; font-size:11px;" onclick="window.socket.emit('clone-save', {username: '${activeUser}', filename: '${saveName}'})">CLONE</button>
                    <button class="btn btn-primary" style="padding:2px 6px; font-size:11px;" onclick="bootGame('${saveName}')">BOOT</button>
                </div>
            </div>`;
    });
});

document.getElementById('back-to-login').onclick = () => { activeUser = null; showScreen('login'); };
document.getElementById('new-run-btn').onclick = () => bootGame('rogue.save');

// --- TERMINAL BOOT ---
window.bootGame = function(saveFile) {
    showScreen('term');
    
    window.term = new Terminal({
        cols: 80, rows: 24, 
        theme: { background: '#05070a', foreground: '#00f2ff', cursor: '#00f2ff' },
        fontFamily: '"JetBrains Mono", "Fira Code", monospace', 
        fontSize: terminalFontSize, 
        cursorBlink: true
    });
    
    window.term.open(screens.term);
    
    window.socket.emit('start-game', { username: activeUser, saveFile: saveFile, cols: 80, rows: 24 });

    // Abfangen von physischen Tastatur-Eingaben für das Smart Inventory
    window.term.onData(data => {
        if (data === 'i' || data === 'I') {
            // Sende 'i' ans Backend und zwinge den Scraper zum Auslesen
            window.socket.emit('input', data);
            if (typeof window.triggerSmartInventoryScan === 'function') {
                window.triggerSmartInventoryScan();
            }
        } else {
            window.socket.emit('input', data);
        }
    });
};

window.socket.on('output', data => { if (window.term) window.term.write(data); });
window.socket.on('game-ended', () => {
    if (window.term) { window.term.dispose(); window.term = null; }
    showScreen('saves');
    window.socket.emit('get-saves', activeUser);
});

// --- SYSTEM CONTROLS ---
document.getElementById('font-plus').onclick = () => {
    if(!window.term) return;
    terminalFontSize = Math.min(terminalFontSize + 2, 48);
    window.term.options.fontSize = terminalFontSize;
    localStorage.setItem('rogue_font_size', terminalFontSize);
};

document.getElementById('font-minus').onclick = () => {
    if(!window.term) return;
    terminalFontSize = Math.max(terminalFontSize - 2, 10);
    window.term.options.fontSize = terminalFontSize;
    localStorage.setItem('rogue_font_size', terminalFontSize);
};

let crtOn = true;
const fxBtn = document.getElementById('fx-toggle');
fxBtn.onclick = () => {
    crtOn = !crtOn;
    document.body.classList.toggle('crt-active', crtOn);
    fxBtn.innerText = crtOn ? '[ CRT: ON ]' : '[ CRT: OFF ]';
};