const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// File upload config
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
}});

// Generate Claim ID: TERMINAL-YYWWDD-COUNT
function generateClaimId(terminalCode, date) {
  const d = new Date(date);
  const year = String(d.getFullYear()).slice(-2);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = String(Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${week}${day}`;
  const prefix = `${terminalCode}-${dateStr}-`;
  const existing = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE claim_id LIKE ?`).get(`${prefix}%`);
  const count = String(existing.c + 1).padStart(1, '0');
  return `${prefix}${count}`;
}

function getWeek(date) {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
}

function logHistory(claimId, userId, changeType, field, oldVal, newVal, notes) {
  db.prepare(`INSERT INTO claim_history(id, claim_id, changed_by, change_type, field_changed, old_value, new_value, notes) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuidv4(), claimId, userId, changeType, field, oldVal, newVal, notes);
}

// GET /claims - list with filters
router.get('/', authMiddleware, (req, res) => {
  const { terminal, status, sqdcpi, week, month, year, search, limit = 50, offset = 0 } = req.query;
  let where = ['1=1'];
  let params = [];

  if (terminal) { where.push('c.terminal_code = ?'); params.push(terminal); }
  if (status) { where.push('c.status = ?'); params.push(status); }
  if (sqdcpi) { where.push('c.sqdcpi = ?'); params.push(sqdcpi); }
  if (week) { where.push('c.week = ?'); params.push(parseInt(week)); }
  if (month) { where.push('c.month = ?'); params.push(parseInt(month)); }
  if (year) { where.push('c.year = ?'); params.push(parseInt(year)); }
  if (search) { where.push('(c.description LIKE ? OR c.vessel_name LIKE ? OR c.claim_id LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const claims = db.prepare(`
    SELECT c.*, t.name as terminal_name,
      u.name as created_by_name, u.planner_id as created_by_pid,
      d3.planner_accountable, pa.name as accountable_name, pa.planner_id as accountable_pid,
      d3.investigation_status, d5.resolution_status as d5_resolution,
      (SELECT COUNT(*) FROM claim_photos WHERE claim_id = c.id) as photo_count
    FROM claims c
    LEFT JOIN terminals t ON c.terminal_code = t.code
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN claim_d3 d3 ON d3.claim_id = c.id
    LEFT JOIN users pa ON d3.planner_accountable = pa.id
    LEFT JOIN claim_d5 d5 ON d5.claim_id = c.id
    WHERE ${where.join(' AND ')}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  const total = db.prepare(`SELECT COUNT(*) as c FROM claims c WHERE ${where.join(' AND ')}`).get(...params);
  res.json({ claims, total: total.c });
});

// GET /claims/stats - dashboard stats
router.get('/stats', authMiddleware, (req, res) => {
  const { year, month } = req.query;
  let filter = year ? `WHERE year = ${parseInt(year)}` : '';
  if (year && month) filter = `WHERE year = ${parseInt(year)} AND month = ${parseInt(month)}`;

  const total = db.prepare(`SELECT COUNT(*) as c FROM claims ${filter}`).get();
  const byStatus = db.prepare(`SELECT status, COUNT(*) as c FROM claims ${filter} GROUP BY status`).all();
  const bySqdcpi = db.prepare(`SELECT sqdcpi, COUNT(*) as c FROM claims ${filter} GROUP BY sqdcpi`).all();
  const byTerminal = db.prepare(`SELECT terminal_code, t.name as terminal_name, COUNT(*) as c FROM claims c LEFT JOIN terminals t ON c.terminal_code = t.code ${filter} GROUP BY terminal_code ORDER BY c DESC LIMIT 10`).all();
  const byWeek = db.prepare(`SELECT week, COUNT(*) as c FROM claims ${filter.replace('WHERE','WHERE') || 'WHERE year = ' + new Date().getFullYear()} GROUP BY week ORDER BY week`).all();
  const openD3 = db.prepare(`SELECT COUNT(*) as c FROM claim_d3 WHERE investigation_status != 'Completed'`).get();
  const recent = db.prepare(`SELECT c.claim_id, c.vessel_name, c.description, c.status, c.claim_date, t.name as terminal_name FROM claims c LEFT JOIN terminals t ON c.terminal_code = t.code ORDER BY c.created_at DESC LIMIT 5`).all();

  res.json({ total: total.c, byStatus, bySqdcpi, byTerminal, byWeek, openD3: openD3.c, recent });
});

// GET /claims/:id - full claim detail
router.get('/:id', authMiddleware, (req, res) => {
  const claim = db.prepare(`
    SELECT c.*, t.name as terminal_name, u.name as created_by_name, u.planner_id as created_by_pid
    FROM claims c
    LEFT JOIN terminals t ON c.terminal_code = t.code
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const d2 = db.prepare('SELECT * FROM claim_d2 WHERE claim_id = ?').get(claim.id);
  const d3 = db.prepare(`
    SELECT d3.*, u.name as accountable_name, u.planner_id as accountable_pid
    FROM claim_d3 d3 LEFT JOIN users u ON d3.planner_accountable = u.id
    WHERE d3.claim_id = ?
  `).get(claim.id);
  const d4 = db.prepare('SELECT * FROM claim_d4 WHERE claim_id = ?').get(claim.id);
  const d5 = db.prepare(`
    SELECT d5.*, u.name as verified_by_name
    FROM claim_d5 d5 LEFT JOIN users u ON d5.verified_by = u.id
    WHERE d5.claim_id = ?
  `).get(claim.id);
  const photos = db.prepare('SELECT * FROM claim_photos WHERE claim_id = ? ORDER BY uploaded_at').all(claim.id);
  const history = db.prepare(`
    SELECT h.*, u.name as user_name, u.planner_id as user_pid
    FROM claim_history h LEFT JOIN users u ON h.changed_by = u.id
    WHERE h.claim_id = ? ORDER BY h.changed_at DESC LIMIT 30
  `).all(claim.id);

  res.json({ claim, d2, d3, d4, d5, photos, history });
});

// POST /claims - create new claim (D1)
router.post('/', authMiddleware, (req, res) => {
  const { terminal_code, claim_date, vessel_visit, vessel_name, description, sqdcpi } = req.body;
  if (!terminal_code || !claim_date || !description) {
    return res.status(400).json({ error: 'Terminal, date and description are required' });
  }

  const terminal = db.prepare('SELECT * FROM terminals WHERE code = ?').get(terminal_code);
  if (!terminal) return res.status(400).json({ error: 'Invalid terminal' });

  const id = uuidv4();
  const claim_id = generateClaimId(terminal_code, claim_date);
  const d = new Date(claim_date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const week = getWeek(claim_date);

  db.prepare(`
    INSERT INTO claims(id, claim_id, terminal_code, claim_date, year, month, week, vessel_visit, vessel_name, description, sqdcpi, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, claim_id, terminal_code, claim_date, year, month, week, vessel_visit || null, vessel_name || null, description, sqdcpi || null, req.user.id);

  // Initialize D2-D5 records
  db.prepare('INSERT INTO claim_d2(id, claim_id) VALUES (?,?)').run(uuidv4(), id);
  db.prepare('INSERT INTO claim_d3(id, claim_id) VALUES (?,?)').run(uuidv4(), id);
  db.prepare('INSERT INTO claim_d4(id, claim_id) VALUES (?,?)').run(uuidv4(), id);
  db.prepare('INSERT INTO claim_d5(id, claim_id) VALUES (?,?)').run(uuidv4(), id);

  logHistory(id, req.user.id, 'CREATE', null, null, claim_id, 'Claim created');

  const created = db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
  res.status(201).json(created);
});

// PATCH /claims/:id - update claim status
router.patch('/:id', authMiddleware, (req, res) => {
  const { status, vessel_name, vessel_visit, description, sqdcpi } = req.body;
  const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Not found' });

  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); logHistory(claim.id, req.user.id, 'STATUS_CHANGE', 'status', claim.status, status, null); }
  if (vessel_name !== undefined) { updates.push('vessel_name = ?'); params.push(vessel_name); }
  if (vessel_visit !== undefined) { updates.push('vessel_visit = ?'); params.push(vessel_visit); }
  if (description) { updates.push('description = ?'); params.push(description); }
  if (sqdcpi !== undefined) { updates.push('sqdcpi = ?'); params.push(sqdcpi); }
  updates.push('updated_at = datetime(\'now\')');
  params.push(req.params.id);

  db.prepare(`UPDATE claims SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json(db.prepare('SELECT * FROM claims WHERE id = ?').get(req.params.id));
});

// PUT /claims/:id/d2 - update D2 containment
router.put('/:id/d2', authMiddleware, (req, res) => {
  const { shift_alert_by, alert_date, ...shifts } = req.body;
  const fields = Object.keys(shifts).filter(k => k.match(/shift_[dcba]_day[123]/));
  const updates = ['updated_at = datetime(\'now\')'];
  const params = [];

  if (shift_alert_by) { updates.push('shift_alert_by = ?'); params.push(shift_alert_by); }
  if (alert_date) { updates.push('alert_date = ?'); params.push(alert_date); }
  fields.forEach(f => { updates.push(`${f} = ?`); params.push(shifts[f]); });
  params.push(req.params.id);

  db.prepare(`UPDATE claim_d2 SET ${updates.join(', ')} WHERE claim_id = ?`).run(...params);
  logHistory(req.params.id, req.user.id, 'D2_UPDATE', 'D2', null, null, 'D2 containment updated');

  // Auto-update claim status
  db.prepare(`UPDATE claims SET status = 'In Progress', updated_at = datetime('now') WHERE id = ? AND status = 'Open'`).run(req.params.id);

  res.json(db.prepare('SELECT * FROM claim_d2 WHERE claim_id = ?').get(req.params.id));
});

// PUT /claims/:id/d3 - update D3 root cause
router.put('/:id/d3', authMiddleware, (req, res) => {
  const { due_date, investigation_status, completion_date, planner_accountable, root_cause } = req.body;
  const updates = ['updated_at = datetime(\'now\')'];
  const params = [];

  if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
  if (investigation_status) { updates.push('investigation_status = ?'); params.push(investigation_status); }
  if (completion_date !== undefined) { updates.push('completion_date = ?'); params.push(completion_date); }
  if (planner_accountable !== undefined) { updates.push('planner_accountable = ?'); params.push(planner_accountable || null); }
  if (root_cause !== undefined) { updates.push('root_cause = ?'); params.push(root_cause); }
  params.push(req.params.id);

  db.prepare(`UPDATE claim_d3 SET ${updates.join(', ')} WHERE claim_id = ?`).run(...params);
  logHistory(req.params.id, req.user.id, 'D3_UPDATE', 'D3', null, null, 'D3 root cause updated');
  res.json(db.prepare('SELECT * FROM claim_d3 WHERE claim_id = ?').get(req.params.id));
});

// PUT /claims/:id/d4 - update D4 corrective actions
router.put('/:id/d4', authMiddleware, (req, res) => {
  const fields = ['due_date','pca1_status','pca1_date','pca2_shift_d','pca2_shift_c','pca2_shift_b','pca2_shift_a',
    'pca3_shift_d','pca3_shift_c','pca3_shift_b','pca3_shift_a','pca4_assigned_to','pca4_wi_status','pca4_completion_date'];
  const updates = ['updated_at = datetime(\'now\')'];
  const params = [];

  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); } });
  params.push(req.params.id);

  db.prepare(`UPDATE claim_d4 SET ${updates.join(', ')} WHERE claim_id = ?`).run(...params);
  logHistory(req.params.id, req.user.id, 'D4_UPDATE', 'D4', null, null, 'D4 corrective actions updated');
  res.json(db.prepare('SELECT * FROM claim_d4 WHERE claim_id = ?').get(req.params.id));
});

// PUT /claims/:id/d5 - update D5 effectiveness (manager only)
router.put('/:id/d5', authMiddleware, (req, res) => {
  const { due_date, process_confirmation_status, process_confirmation_date, effectiveness_verified, resolution_status, notes } = req.body;
  const updates = ['updated_at = datetime(\'now\')'];
  const params = [];

  if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
  if (process_confirmation_status) { updates.push('process_confirmation_status = ?'); params.push(process_confirmation_status); }
  if (process_confirmation_date !== undefined) { updates.push('process_confirmation_date = ?'); params.push(process_confirmation_date); }
  if (effectiveness_verified !== undefined) { updates.push('effectiveness_verified = ?'); params.push(effectiveness_verified ? 1 : 0); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (resolution_status) {
    updates.push('resolution_status = ?', 'verified_by = ?', 'verified_at = datetime(\'now\')');
    params.push(resolution_status, req.user.id);
    if (resolution_status === 'Closed') {
      db.prepare(`UPDATE claims SET status = 'Closed', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    }
  }
  params.push(req.params.id);

  db.prepare(`UPDATE claim_d5 SET ${updates.join(', ')} WHERE claim_id = ?`).run(...params);
  logHistory(req.params.id, req.user.id, 'D5_UPDATE', 'D5', null, null, 'D5 effectiveness updated');
  res.json(db.prepare('SELECT * FROM claim_d5 WHERE claim_id = ?').get(req.params.id));
});

// POST /claims/:id/photos
router.post('/:id/photos', authMiddleware, upload.array('photos', 10), (req, res) => {
  const claim = db.prepare('SELECT id FROM claims WHERE id = ?').get(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const inserted = req.files.map(file => {
    const id = uuidv4();
    db.prepare('INSERT INTO claim_photos(id, claim_id, filename, original_name, uploaded_by) VALUES (?,?,?,?,?)')
      .run(id, claim.id, file.filename, file.originalname, req.user.id);
    return { id, filename: file.filename, original_name: file.originalname };
  });

  logHistory(claim.id, req.user.id, 'PHOTO_UPLOAD', 'photos', null, `${req.files.length} photos`, null);
  res.json(inserted);
});

// DELETE /claims/:id/photos/:photoId
router.delete('/:id/photos/:photoId', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM claim_photos WHERE id = ? AND claim_id = ?').run(req.params.photoId, req.params.id);
  res.json({ success: true });
});

// GET terminals list
router.get('/meta/terminals', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM terminals ORDER BY code').all());
});

router.get('/meta/users', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, planner_id, name, role FROM users WHERE active = 1 ORDER BY name').all());
});

module.exports = router;
