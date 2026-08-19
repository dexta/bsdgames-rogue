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

// Speicherverzeichnis für alle Spieler-Profile
const SAVES_DIR = path.join(__dirname, 'saves');
if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// Hilfsfunktion: Gibt die Liste vorhandener Ordner/Spieler zurück
function getExistingPlayers() {
    try {
        return fs.readdirSync(SAVES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
    } catch (err) {
        console.error('Fehler beim Lesen des Save-Ordners:', err);
        return [];
    }
}

io.on('connection', (socket) => {
    console.log('Client verbunden:', socket.id);
    let ptyProcess = null;

    // 1. Spielerliste an Client senden
    socket.on('get-players', () => {
        socket.emit('player-list', getExistingPlayers());
    });

    // 2. Spiel für ausgewählten/neuen Spieler starten
    socket.on('start-game', (config) => {
        if (ptyProcess) {
            try { ptyProcess.kill(); } catch (e) {}
            ptyProcess = null;
        }

        // Sicherheits-Check für Dateipfad
        const username = (config.username || 'guest').replace(/[^a-zA-Z0-9_-]/g, '') || 'guest';
        const userDir = path.join(SAVES_DIR, username);

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        // Prüfen, ob eine rogue.save Datei im User-Ordner liegt
        const saveFile = path.join(userDir, 'rogue.save');
        const hasSave = fs.existsSync(saveFile);
        const rogueArgs = ["-c","-f"];
        if(hasSave) {
            rogueArgs.push(saveFile);
        }

        console.log(`Starte Rogue für Spieler: "${username}" (Restore: ${hasSave})`);

        // PTY-Instanz erzeugen
        ptyProcess = pty.spawn('/usr/games/rogue', rogueArgs, {
            name: 'xterm-256color',
            cols: config.cols || 80,
            rows: config.rows || 24,
            cwd: userDir, // CWD = User-Ordner -> Rogue liest/schreibt rogue.save hier
            env: { 
                ...process.env, 
                USER: username,
                ROGUEOPTS: `name=${username}`
            }
        });

        // Output an Client weiterleiten
        ptyProcess.onData((data) => {
            socket.emit('output', data);
        });

        // Wenn Rogue beendet wird (Save, Quit oder Tod)
        ptyProcess.onExit(({ exitCode }) => {
            console.log(`Rogue beendet für ${username} (Code: ${exitCode})`);
            ptyProcess = null;
            // Signalisiere dem Frontend die Rückkehr zum Hauptmenü
            socket.emit('game-ended');
            // Sende aktualisierte Spielerliste
            socket.emit('player-list', getExistingPlayers());
        });
    });

    // 3. Tastatureingaben vom Frontend verarbeiten
    socket.on('input', (data) => {
        if (ptyProcess) {
            ptyProcess.write(data);
        }
    });

    // 4. Fenstergrößen-Änderung an PTY weitergeben
    socket.on('resize', (size) => {
        if (ptyProcess) {
            try {
                ptyProcess.resize(size.cols, size.rows);
            } catch (e) {
                console.error('PTY Resize Fehler:', e);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client getrennt:', socket.id);
        if (ptyProcess) {
            try { ptyProcess.kill(); } catch (e) {}
            ptyProcess = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[MASCHINEN-INSTANZ] Server aktiv auf http://localhost:${PORT}`);
});