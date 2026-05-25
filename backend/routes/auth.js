const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { planner_id, password } = req.body;
  if (!planner_id || !password) return res.status(400).json({ error: 'Planner ID and password required' });

  const user = db.prepare('SELECT * FROM users WHERE planner_id = ? AND active = 1').get(planner_id.toUpperCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, planner_id: user.planner_id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { id: user.id, planner_id: user.planner_id, name: user.name, role: user.role } });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, planner_id, name, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
