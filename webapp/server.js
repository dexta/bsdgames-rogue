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
        // NEU: Großzügigere Suche - jede Datei, die 'save' im Namen hat, ist gültig
        return fs.readdirSync(userDir)
                 .filter(f => f.toLowerCase().includes('save'))
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

    socket.on('get-players', () => socket.emit('player-list', getExistingPlayers()));
    socket.on('get-saves', (username) => socket.emit('save-list', { username, saves: getPlayerSaves(username) }));

    socket.on('clone-save', ({ username, filename }) => {
        const userDir = path.join(SAVES_DIR, username);
        const sourcePath = path.join(userDir, filename);
        if (fs.existsSync(sourcePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 15);
            // Auch wenn das Backup 'bak' heißt, wir hängen '.save' an, damit der neue Scanner es sicher findet
            const destPath = path.join(userDir, `${filename}_bak_${timestamp}.save`);
            fs.copyFileSync(sourcePath, destPath);
            socket.emit('save-list', { username, saves: getPlayerSaves(username) });
        }
    });

    socket.on('start-game', (config) => {
        if (ptyProcess) { try { ptyProcess.kill(); } catch (e) {} ptyProcess = null; }

        const username = (config.username || 'guest').replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(SAVES_DIR, username);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

        const targetSave = config.saveFile ? config.saveFile.replace(/[^a-zA-Z0-9_.-]/g, '') : 'rogue.save';
        const savePath = path.join(userDir, targetSave);
        const hasSave = fs.existsSync(savePath);

        const rogueArgs = ["-c", "-f"];
        if (hasSave) rogueArgs.push(savePath);

        console.log(`[BOOT] Spieler: ${username} | File: ${targetSave} | Restore: ${hasSave}`);

        ptyProcess = pty.spawn('/usr/games/rogue', rogueArgs, {
            name: 'xterm-256color', cols: 80, rows: 24, cwd: userDir, 
            env: { ...process.env, USER: username, ROGUEOPTS: `name=${username}` }
        });

        ptyProcess.onData(data => socket.emit('output', data));
        ptyProcess.onExit(({ exitCode }) => {
            console.log(`[HALT] Code: ${exitCode}`);
            ptyProcess = null;
            socket.emit('game-ended');
            socket.emit('player-list', getExistingPlayers());
        });
    });

    socket.on('input', data => { if (ptyProcess) ptyProcess.write(data); });
    socket.on('disconnect', () => { if (ptyProcess) try { ptyProcess.kill(); } catch(e){} });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[MASCHINEN-INSTANZ] http://localhost:${PORT}`));