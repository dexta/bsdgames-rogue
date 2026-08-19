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

// Hauptordner für alle Savegames anlegen, falls nicht vorhanden
const SAVES_DIR = path.join(__dirname, 'saves');
if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR);

io.on('connection', (socket) => {
    console.log('Client verbunden:', socket.id);
    let ptyProcess = null;

    // Warte auf das Start-Event vom Frontend inkl. Username
    socket.on('start-game', (config) => {
        // 1. Username bereinigen (Sicherheit gegen Path-Traversal)
        const username = config.username.replace(/[^a-zA-Z0-9_-]/g, '') || 'guest';
        
        // 2. User-spezifisches Verzeichnis erstellen
        const userDir = path.join(SAVES_DIR, username);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir);

        // 3. Prüfen, ob ein Savegame existiert
        const saveFile = path.join(userDir, 'rogue.save');
        const rogueSave = fs.existsSync(saveFile) ? saveFile : '';
	const rogueArgs = ["-f","-c"];

        // 4. BSD-Rogue starten
        ptyProcess = pty.spawn('/usr/games/rogue', rogueArgs, {
            name: 'xterm-color',
            cols: 80, // Rogue bevorzugt 80x24
            rows: 24,
            cwd: userDir, // CWD ist der User-Ordner -> rogue.save landet hier!
            env: { 
                ...process.env, 
                USER: username, 
                // Optionale Rogue-Umgebungsvariablen (Name im Spiel)
                ROGUEOPTS: `name=${username}` 
            }
        });

        // 5. I/O Routing
        ptyProcess.onData((data) => socket.emit('output', data));
        
        // Wenn Rogue beendet wird (Tod oder Save), Client benachrichtigen
        ptyProcess.onExit(() => {
            socket.emit('game-over', 'Rogue wurde beendet.');
        });
    });

    socket.on('input', (data) => {
        if (ptyProcess) ptyProcess.write(data);
    });

    socket.on('resize', (size) => {
        if (ptyProcess) {
            try { ptyProcess.resize(size.cols, size.rows); } catch (e) {}
        }
    });

    socket.on('disconnect', () => {
        if (ptyProcess) ptyProcess.kill();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`));
