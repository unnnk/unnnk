const express = require('express');
const { getDb } = require('../database');

const router = express.Router();

// Middleware: must be logged in
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Não autenticado.' });
  next();
}

// Middleware: must be admin
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
}

// GET all tips (public - no auth required)
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.session.user ? req.session.user.id : null;

  const tips = db.prepare(`
    SELECT t.*,
      utr.got_it as user_got_it,
      utr.id as user_result_id
    FROM tips t
    LEFT JOIN user_tip_results utr ON utr.tip_id = t.id AND utr.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId);

  res.json({ tips });
});

// GET single tip
router.get('/:id', (req, res) => {
  const db = getDb();
  const tip = db.prepare('SELECT * FROM tips WHERE id = ?').get(req.params.id);
  if (!tip) return res.status(404).json({ error: 'Tip não encontrada.' });
  res.json({ tip });
});

// POST create tip (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { sport, league, match_teams, match_date, tip_type, tip_detail, odds, confidence, analysis } = req.body;

  if (!sport || !match_teams || !tip_type || !tip_detail) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO tips (sport, league, match_teams, match_date, tip_type, tip_detail, odds, confidence, analysis, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sport, league || '', match_teams, match_date || null, tip_type, tip_detail, odds || null, confidence || 3, analysis || '', req.session.user.id);

  const tip = db.prepare('SELECT * FROM tips WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, tip });
});

// PUT update tip (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { sport, league, match_teams, match_date, tip_type, tip_detail, odds, confidence, analysis, status, result } = req.body;

  const tip = db.prepare('SELECT * FROM tips WHERE id = ?').get(req.params.id);
  if (!tip) return res.status(404).json({ error: 'Tip não encontrada.' });

  db.prepare(`
    UPDATE tips SET
      sport = ?, league = ?, match_teams = ?, match_date = ?, tip_type = ?,
      tip_detail = ?, odds = ?, confidence = ?, analysis = ?, status = ?,
      result = ?, resolved_at = CASE WHEN ? IS NOT NULL AND ? != 'pending' THEN CURRENT_TIMESTAMP ELSE resolved_at END
    WHERE id = ?
  `).run(
    sport || tip.sport,
    league !== undefined ? league : tip.league,
    match_teams || tip.match_teams,
    match_date || tip.match_date,
    tip_type || tip.tip_type,
    tip_detail || tip.tip_detail,
    odds !== undefined ? odds : tip.odds,
    confidence || tip.confidence,
    analysis !== undefined ? analysis : tip.analysis,
    status || tip.status,
    result !== undefined ? result : tip.result,
    status || tip.status,
    status || tip.status,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM tips WHERE id = ?').get(req.params.id);
  res.json({ success: true, tip: updated });
});

// DELETE tip (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const tip = db.prepare('SELECT id FROM tips WHERE id = ?').get(req.params.id);
  if (!tip) return res.status(404).json({ error: 'Tip não encontrada.' });

  db.prepare('DELETE FROM user_tip_results WHERE tip_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tips WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

// POST mark tip result for user (got_it: 1 or 0)
router.post('/:id/mark', requireAuth, (req, res) => {
  const { got_it } = req.body;
  const db = getDb();
  const userId = req.session.user.id;
  const tipId = req.params.id;

  const tip = db.prepare('SELECT id FROM tips WHERE id = ?').get(tipId);
  if (!tip) return res.status(404).json({ error: 'Tip não encontrada.' });

  // Upsert
  db.prepare(`
    INSERT INTO user_tip_results (user_id, tip_id, got_it)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, tip_id) DO UPDATE SET got_it = excluded.got_it, noted_at = CURRENT_TIMESTAMP
  `).run(userId, tipId, got_it ? 1 : 0);

  res.json({ success: true });
});

// DELETE unmark
router.delete('/:id/mark', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM user_tip_results WHERE user_id = ? AND tip_id = ?').run(req.session.user.id, req.params.id);
  res.json({ success: true });
});

// GET stats for admin dashboard
router.get('/admin/stats', requireAdmin, (req, res) => {
  const db = getDb();

  const totalTips = db.prepare('SELECT COUNT(*) as c FROM tips').get().c;
  const pendingTips = db.prepare("SELECT COUNT(*) as c FROM tips WHERE status = 'pending'").get().c;
  const resolvedTips = db.prepare("SELECT COUNT(*) as c FROM tips WHERE status = 'resolved'").get().c;
  const wonTips = db.prepare("SELECT COUNT(*) as c FROM tips WHERE result = 'won'").get().c;
  const lostTips = db.prepare("SELECT COUNT(*) as c FROM tips WHERE result = 'lost'").get().c;
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  const recentTips = db.prepare(`
    SELECT t.*, u.username as creator
    FROM tips t
    LEFT JOIN users u ON u.id = t.created_by
    ORDER BY t.created_at DESC
    LIMIT 10
  `).all();

  const userResults = db.prepare(`
    SELECT u.username, u.email,
      COUNT(utr.id) as total_marked,
      SUM(utr.got_it) as total_got,
      SUM(CASE WHEN utr.got_it = 0 THEN 1 ELSE 0 END) as total_not_got
    FROM users u
    LEFT JOIN user_tip_results utr ON utr.user_id = u.id
    WHERE u.role = 'user'
    GROUP BY u.id
    ORDER BY total_marked DESC
  `).all();

  res.json({ totalTips, pendingTips, resolvedTips, wonTips, lostTips, totalUsers, recentTips, userResults });
});

// GET user personal dashboard
router.get('/user/dashboard', requireAuth, (req, res) => {
  const db = getDb();
  const userId = req.session.user.id;

  const stats = db.prepare(`
    SELECT
      COUNT(utr.id) as total_marked,
      SUM(utr.got_it) as total_got,
      SUM(CASE WHEN utr.got_it = 0 THEN 1 ELSE 0 END) as total_not_got
    FROM user_tip_results utr
    WHERE utr.user_id = ?
  `).get(userId);

  const history = db.prepare(`
    SELECT t.*, utr.got_it, utr.noted_at
    FROM user_tip_results utr
    JOIN tips t ON t.id = utr.tip_id
    WHERE utr.user_id = ?
    ORDER BY utr.noted_at DESC
  `).all(userId);

  res.json({ stats, history });
});

module.exports = router;
