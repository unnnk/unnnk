function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.accepts('html')) {
      return res.redirect('/login.html');
    }
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    if (req.accepts('html')) {
      return res.redirect('/index.html');
    }
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
