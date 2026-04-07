const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
const SQLiteStore = require('connect-sqlite3')(session);
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'data') }),
  secret: 'tipster-super-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Initialize DB
const { getDb } = require('./src/database');
getDb(); // triggers schema creation & admin seed

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/tips', require('./src/routes/tips'));

// Protected page routes
const { requireAuth, requireAdmin } = require('./src/middleware');

app.get('/', (req, res) => {
  res.redirect('/portal.html');
});

app.get('/portal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

app.get('/admin.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Static files (login, register, css, js)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`\n🚀 EXP Tips Bot rodando em http://localhost:${PORT}`);
  console.log(`📋 Login: admin@exptipsbot.com / Admin@123\n`);
});
