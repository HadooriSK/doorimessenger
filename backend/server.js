require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Database pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initDB() {
    try {
        await pool.query('SELECT 1');
        console.log('Database connected successfully.');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
}
initDB();

// Active users tracking (username -> socket id)
const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let currentUsername = null;

    socket.on('login', async (data, callback) => {
        const { username, pin } = data;
        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
            let user = rows[0];

            if (user) {
                // User exists, check PIN if they have one
                if (user.pin_hash) {
                    if (!pin) {
                        return callback({ success: false, requirePin: true });
                    }
                    const match = await bcrypt.compare(pin, user.pin_hash);
                    if (!match) {
                        return callback({ success: false, error: 'Falscher PIN.' });
                    }
                }
                // Update last seen
                await pool.execute('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            } else {
                // Register new user
                const [result] = await pool.execute('INSERT INTO users (username) VALUES (?)', [username]);
                user = { id: result.insertId, username, sound: 1, show_last_seen: 1, read_receipts: 1 };
            }

            currentUsername = username;
            activeUsers.set(username, socket.id);
            socket.join('general');

            // Send full state to user
            const [blocked] = await pool.execute('SELECT blocked_username FROM blocked_contacts WHERE user_username = ?', [username]);
            const blockedList = blocked.map(b => b.blocked_username);

            // Fetch recent history
            const [history] = await pool.execute(
                `SELECT * FROM messages WHERE room_id = 'general' OR sender_username = ? OR recipient_username = ? ORDER BY created_at ASC LIMIT 100`,
                [username, username]
            );

            // Fetch active profiles
            const [allUsers] = await pool.execute('SELECT username, avatar_url, sound, show_last_seen, read_receipts FROM users');

            callback({
                success: true,
                user: {
                    username: user.username,
                    avatarUrl: user.avatar_url,
                    sound: !!user.sound,
                    showLastSeen: !!user.show_last_seen,
                    readReceipts: !!user.read_receipts
                },
                blockedContacts: blockedList,
                history,
                profiles: allUsers
            });

            // Notify others
            socket.broadcast.emit('user_joined', { username, profile: user });

        } catch (err) {
            console.error('Login error:', err);
            callback({ success: false, error: 'Serverfehler beim Login.' });
        }
    });

    socket.on('send_message', async (data) => {
        if (!currentUsername) return;
        const { recipient, room, text, mediaType, mediaUrl } = data;

        try {
            // Check if blocked
            if (recipient) {
                const [blocked] = await pool.execute(
                    'SELECT 1 FROM blocked_contacts WHERE user_username = ? AND blocked_username = ?',
                    [recipient, currentUsername]
                );
                if (blocked.length > 0) {
                    // Recipient has blocked sender. Do not deliver.
                    // But we still save it so sender sees it? Better not to save or save quietly.
                    return;
                }
            }

            const [result] = await pool.execute(
                'INSERT INTO messages (sender_username, recipient_username, room_id, text, media_type, media_url) VALUES (?, ?, ?, ?, ?, ?)',
                [currentUsername, recipient || null, room || null, text || null, mediaType || null, mediaUrl || null]
            );

            const msgObj = {
                id: result.insertId,
                sender_username: currentUsername,
                recipient_username: recipient,
                room_id: room,
                text,
                media_type: mediaType,
                media_url: mediaUrl,
                created_at: new Date()
            };

            if (room === 'general') {
                io.to('general').emit('new_message', msgObj);
            } else if (recipient) {
                const recipientSocketId = activeUsers.get(recipient);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('new_message', msgObj);
                }
                // Send back to sender
                socket.emit('new_message', msgObj);
            }
        } catch (err) {
            console.error('Send message error:', err);
        }
    });

    socket.on('update_profile', async (data) => {
        if (!currentUsername) return;
        const { avatarUrl, sound, showLastSeen, readReceipts } = data;
        try {
            await pool.execute(
                'UPDATE users SET avatar_url = ?, sound = ?, show_last_seen = ?, read_receipts = ? WHERE username = ?',
                [avatarUrl, sound ? 1 : 0, showLastSeen ? 1 : 0, readReceipts ? 1 : 0, currentUsername]
            );
            io.emit('profile_updated', { username: currentUsername, avatarUrl, sound, showLastSeen, readReceipts });
        } catch (err) {
            console.error('Update profile error:', err);
        }
    });

    socket.on('set_pin', async (data, callback) => {
        if (!currentUsername) return;
        const { pin } = data;
        try {
            const hash = pin ? await bcrypt.hash(pin, 10) : null;
            await pool.execute('UPDATE users SET pin_hash = ? WHERE username = ?', [hash, currentUsername]);
            callback({ success: true });
        } catch (err) {
            console.error('Set PIN error:', err);
            callback({ success: false });
        }
    });

    socket.on('block_user', async (data) => {
        if (!currentUsername) return;
        const { blockedUsername } = data;
        try {
            await pool.execute(
                'INSERT IGNORE INTO blocked_contacts (user_username, blocked_username) VALUES (?, ?)',
                [currentUsername, blockedUsername]
            );
            socket.emit('user_blocked', { blockedUsername });
        } catch (err) {
            console.error('Block user error:', err);
        }
    });

    socket.on('unblock_user', async (data) => {
        if (!currentUsername) return;
        const { blockedUsername } = data;
        try {
            await pool.execute(
                'DELETE FROM blocked_contacts WHERE user_username = ? AND blocked_username = ?',
                [currentUsername, blockedUsername]
            );
            socket.emit('user_unblocked', { blockedUsername });
        } catch (err) {
            console.error('Unblock user error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (currentUsername) {
            activeUsers.delete(currentUsername);
            io.emit('user_left', { username: currentUsername });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
