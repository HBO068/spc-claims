const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, requireRole('manager', 'supervisor'), (req, res) => {
  res.json(db.prepare('SELECT id, planner_id, name, role, active, created_at FROM users ORDER BY name').all());
});

router.post('/', authMiddleware, requireRole('manager'), (req, res) => {
  const { planner_id, name, password, role } = req.body;
  if (!planner_id || !name || !password || !role) return res.status(400).json({ error: 'All fields required' });
  const existing = db.prepare('SELECT id FROM users WHERE planner_id = ?').get(planner_id.toUpperCase());
  if (existing) return res.status(400).json({ error: 'Planner ID already exists' });

  const id = uuidv4();
  db.prepare('INSERT INTO users(id, planner_id, name, password_hash, role) VALUES (?,?,?,?,?)')
    .run(id, planner_id.toUpperCase(), name, bcrypt.hashSync(password, 10), role);
  res.status(201).json({ id, planner_id: planner_id.toUpperCase(), name, role });
});

router.patch('/:id', authMiddleware, requireRole('manager'), (req, res) => {
  const { name, role, active, password } = req.body;
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT id, planner_id, name, role, active FROM users WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authMiddleware, requireRole('manager'), (req, res) => {
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
