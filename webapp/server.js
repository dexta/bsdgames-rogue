const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');
const path = require('path');

const app = express();
// WICHTIG: Express 5 App muss in einen HTTP-Server gewrappt werden!
const server = http.createServer(app); 
const io = new Server(server);

// Ordner für das Frontend freigeben (hier legen wir gleich die index.html rein)
app.use(express.static(path.join(__dirname, 'frontend')));

// Welches Betriebssystem? Bash für Linux/Mac, Powershell für Windows
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

io.on('connection', (socket) => {
    console.log('Client verbunden:', socket.id);

    // 1. Neues Pseudo-Terminal (PTY) für diese Verbindung starten
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.cwd(), // Startverzeichnis
        env: process.env
    });

    // 2. Output vom Terminal an das Frontend senden
    ptyProcess.onData((data) => {
        socket.emit('output', data);
    });

    // 3. Input vom Frontend an das Terminal senden
    socket.on('input', (data) => {
        ptyProcess.write(data);
    });

    // 4. Fenstergrößen-Änderung (Resize) verarbeiten
    socket.on('resize', (size) => {
        try {
            ptyProcess.resize(size.cols, size.rows);
        } catch (e) {
            console.error('Resize-Fehler:', e);
        }
    });

    // 5. Aufräumen, wenn der Browser geschlossen wird
    socket.on('disconnect', () => {
        console.log('Client getrennt:', socket.id);
        ptyProcess.kill();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});