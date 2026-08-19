const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app); 
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'frontend')));

const SAVES_DIR = path.join(__dirname, 'saves');
if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
}

function getExistingPlayers() {
    try {
        return fs.readdirSync(SAVES_DIR, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
    } catch (err) { return []; }
}

function getPlayerSaves(username) {
    try {
        const userDir = path.join(SAVES_DIR, username);
        if (!fs.existsSync(userDir)) return [];
        // Nur .save Dateien zurückgeben, absteigend sortiert nach Änderungsdatum
        return fs.readdirSync(userDir)
                 .filter(f => f.endsWith('.save'))
                 .map(f => ({
                     name: f,
                     mtime: fs.statSync(path.join(userDir, f)).mtime.getTime()
                 }))
                 .sort((a, b) => b.mtime - a.mtime)
                 .map(f => f.name);
    } catch(err) { return []; }
}

io.on('connection', (socket) => {
    console.log('[SYSTEM] Client verbunden:', socket.id);
    let ptyProcess = null;

    // --- MAIN MENU & SAVE MANAGER LOGIK ---
    socket.on('get-players', () => {
        socket.emit('player-list', getExistingPlayers());
    });

    socket.on('get-saves', (username) => {
        socket.emit('save-list', { username, saves: getPlayerSaves(username) });
    });

    // Save Scumming: Dupliziert ein Savegame
    socket.on('clone-save', ({ username, filename }) => {
        const userDir = path.join(SAVES_DIR, username);
        const sourcePath = path.join(userDir, filename);
        
        if (fs.existsSync(sourcePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 15);
            const baseName = filename.replace('.save', '');
            const destPath = path.join(userDir, `${baseName}_bak_${timestamp}.save`);
            
            fs.copyFileSync(sourcePath, destPath);
            // Sende direkt die aktualisierte Liste zurück
            socket.emit('save-list', { username, saves: getPlayerSaves(username) });
        }
    });

    // --- GAME LAUNCH LOGIK ---
    socket.on('start-game', (config) => {
        if (ptyProcess) {
            try { ptyProcess.kill(); } catch (e) {}
            ptyProcess = null;
        }

        const username = (config.username || 'guest').replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(SAVES_DIR, username);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

        // Wenn ein spezifisches Savefile angefragt wurde, nutze es, sonst fallback auf rogue.save
        const targetSave = config.saveFile ? config.saveFile.replace(/[^a-zA-Z0-9_.-]/g, '') : 'rogue.save';
        const savePath = path.join(userDir, targetSave);
        const hasSave = fs.existsSync(savePath);

        // Deine exakten Kontext-Parameter
        const rogueArgs = ["-c", "-f"];
        if (hasSave) {
            rogueArgs.push(savePath);
        }

        console.log(`[BOOT] Spieler: ${username} | File: ${targetSave} | Restore: ${hasSave}`);

        ptyProcess = pty.spawn('/usr/games/rogue', rogueArgs, {
            name: 'xterm-256color',
            cols: config.cols || 80,
            rows: config.rows || 24,
            cwd: userDir, 
            env: { ...process.env, USER: username, ROGUEOPTS: `name=${username}` }
        });

        ptyProcess.onData((data) => socket.emit('output', data));

        ptyProcess.onExit(({ exitCode }) => {
            console.log(`[HALT] Code: ${exitCode}`);
            ptyProcess = null;
            socket.emit('game-ended');
            socket.emit('player-list', getExistingPlayers());
        });
    });

    socket.on('input', (data) => { if (ptyProcess) ptyProcess.write(data); });
    socket.on('resize', (size) => { if (ptyProcess) { try { ptyProcess.resize(size.cols, size.rows); } catch(e){} } });
    socket.on('disconnect', () => { if (ptyProcess) { try { ptyProcess.kill(); } catch(e){} } });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[MASCHINEN-INSTANZ] http://localhost:${PORT}`));