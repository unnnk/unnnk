const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/tipster.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport TEXT NOT NULL,
      league TEXT,
      match_teams TEXT NOT NULL,
      match_date TEXT,
      tip_type TEXT NOT NULL,
      tip_detail TEXT NOT NULL,
      odds REAL,
      confidence INTEGER DEFAULT 3,
      analysis TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT DEFAULT NULL,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS user_tip_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      tip_id INTEGER NOT NULL REFERENCES tips(id),
      got_it INTEGER NOT NULL DEFAULT 0,
      noted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, tip_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired DATETIME NOT NULL
    );
  `);

  // Create default admin user
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin@123', 12);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES ('admin', 'admin@exptipsbot.com', ?, 'admin')
    `).run(hash);
    console.log('✅ Default admin user created: admin / Admin@123');
  }

  // Seed sample tips if empty
  const tipCount = db.prepare("SELECT COUNT(*) as c FROM tips").get();
  if (tipCount.c === 0) {
    seedSampleTips();
  }
}

function seedSampleTips() {
  const insert = db.prepare(`
    INSERT INTO tips (sport, league, match_teams, match_date, tip_type, tip_detail, odds, confidence, analysis, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const yesterday = new Date(now.getTime() - 86400000);

  const fmt = (d) => d.toISOString().split('T')[0];

  insert.run('Futebol', 'Brasileirão Série A', 'Flamengo x Palmeiras', fmt(tomorrow),
    'Resultado', '1X (Vitória da Casa ou Empate)', 1.75, 4,
    'Flamengo joga em casa com ótimo aproveitamento nos últimos 5 jogos (4V 1E). Palmeiras tem viagem longa e desfalques na defesa. Linha de pressão do Fla tende a criar muitas oportunidades.',
    'pending');

  insert.run('Futebol', 'Champions League', 'Real Madrid x Man City', fmt(tomorrow),
    'Over/Under', 'Over 2.5 Gols', 1.85, 5,
    'Confronto histórico entre dois dos maiores atacantes da Europa. Média combinada de 3.2 gols nos últimos 5 jogos de ambas equipes. Ambas marcaram em todos os confrontos recentes.',
    'pending');

  insert.run('Futebol', 'Brasileirão Série A', 'Corinthians x São Paulo', fmt(yesterday),
    'Ambas Marcam', 'Sim', 1.90, 3,
    'Clássico paulista sempre equilibrado. São Paulo vem com ataque forte e Corinthians precisa dos pontos. Alta probabilidade de gols dos dois lados.',
    'resolved');

  insert.run('Basquete', 'NBA', 'Lakers x Warriors', fmt(now),
    'Handicap', 'Lakers -4.5', 1.95, 3,
    'Lakers em casa com LeBron em boa fase. Warriors viajando de back-to-back. Vantagem histórica do mando de quadra nesse confronto.',
    'pending');

  insert.run('Tênis', 'Roland Garros', 'Sinner x Alcaraz', fmt(tomorrow),
    'Resultado', 'Alcaraz vence', 1.70, 4,
    'Alcaraz tem histórico superior no saibro em 2024. Sinner ainda se recupera de lesão no pulso. Estatísticas de aproveitamento no primeiro set favorecem Alcaraz.',
    'pending');
}

module.exports = { getDb };
