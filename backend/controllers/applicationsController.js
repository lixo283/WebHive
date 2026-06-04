const pool = require('../db/pool');

const VALID_STATUSES = new Set(['new', 'work', 'done']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-() ]{7,32}$/;

async function createApplication(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      service_id,
      contact_name,
      contact_email,
      contact_phone,
      comment,
    } = req.body;

    if (!service_id) {
      return res.status(400).json({ error: 'service_id is required' });
    }

    const normalizedName = String(contact_name || '').trim();
    const normalizedEmail = String(contact_email || '').trim();
    const normalizedPhone = String(contact_phone || '').trim();
    const normalizedComment = String(comment || '').trim();

    if (normalizedName.length < 2) {
      return res.status(400).json({ error: 'contact_name must contain at least 2 characters' });
    }
    if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: 'contact_email must be a valid email address' });
    }
    if (!normalizedPhone || !PHONE_RE.test(normalizedPhone)) {
      return res.status(400).json({ error: 'contact_phone must be 7-32 chars and contain only digits or +()- spaces' });
    }
    if (normalizedComment && normalizedComment.length < 12) {
      return res.status(400).json({ error: 'comment must be at least 12 characters or empty' });
    }

    const serviceId = Number(service_id);
    if (!Number.isInteger(serviceId) || serviceId < 1) {
      return res.status(400).json({ error: 'service_id must be a positive integer' });
    }

    const serviceExists = await client.query('SELECT id FROM services WHERE id = $1 LIMIT 1', [serviceId]);
    if (serviceExists.rowCount === 0) {
      return res.status(404).json({ error: 'service not found' });
    }

    await client.query('BEGIN');

    const created = await client.query(
      `INSERT INTO applications (user_id, service_id, contact_name, contact_email, contact_phone, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, service_id, status, contact_name, contact_email, contact_phone, comment, status_updated_at, updated_at, created_at`,
      [req.user.id, serviceId, normalizedName, normalizedEmail, normalizedPhone, normalizedComment || null]
    );

    await client.query(
      `INSERT INTO application_status_history (application_id, old_status, new_status, changed_by_user_id)
       VALUES ($1, NULL, $2, $3)`,
      [created.rows[0].id, created.rows[0].status, req.user.id]
    );

    await client.query('COMMIT');
    return res.status(201).json(created.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackErr) {
      // ignore rollback error
    }
    return next(err);
  } finally {
    client.release();
  }
}

async function listApplications(req, res, next) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status } = req.query;

    if (status && !VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'status must be one of: new, work, done' });
    }

    const params = [];
    const where = [];

    if (!isAdmin) {
      params.push(req.user.id);
      where.push(`a.user_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT
         a.id,
         a.user_id,
         u.login,
         a.service_id,
         s.name AS service_name,
         a.status,
         a.contact_name,
         a.contact_email,
         a.contact_phone,
         a.comment,
         a.status_updated_at,
         a.updated_at,
         a.created_at
       FROM applications a
       JOIN users u ON u.id = a.user_id
       JOIN services s ON s.id = a.service_id
       ${whereSql}
       ORDER BY a.id DESC`,
      params
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function getApplicationHistory(req, res, next) {
  try {
    const applicationId = Number(req.params.id);
    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({ error: 'application id must be a positive integer' });
    }

    const appMeta = await pool.query(
      'SELECT id, user_id FROM applications WHERE id = $1',
      [applicationId]
    );
    if (appMeta.rowCount === 0) {
      return res.status(404).json({ error: 'application not found' });
    }

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && appMeta.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const result = await pool.query(
      `SELECT
         h.id,
         h.application_id,
         h.old_status,
         h.new_status,
         h.changed_by_user_id,
         u.login AS changed_by_login,
         h.changed_at
       FROM application_status_history h
       LEFT JOIN users u ON u.id = h.changed_by_user_id
       WHERE h.application_id = $1
       ORDER BY h.changed_at ASC, h.id ASC`,
      [applicationId]
    );

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function updateApplicationStatus(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;
    const applicationId = Number(id);

    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({ error: 'application id must be a positive integer' });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'status must be one of: new, work, done' });
    }

    await client.query('BEGIN');

    const current = await client.query(
      `SELECT id, user_id, service_id, status, contact_name, contact_email, contact_phone, comment, status_updated_at, updated_at, created_at
       FROM applications
       WHERE id = $1`,
      [applicationId]
    );
    if (current.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'application not found' });
    }

    const currentRow = current.rows[0];
    if (currentRow.status === status) {
      await client.query('ROLLBACK');
      return res.json(currentRow);
    }

    const updated = await client.query(
      `UPDATE applications
       SET status = $1,
           status_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, service_id, status, contact_name, contact_email, contact_phone, comment, status_updated_at, updated_at, created_at`,
      [status, applicationId]
    );

    await client.query(
      `INSERT INTO application_status_history (application_id, old_status, new_status, changed_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [applicationId, currentRow.status, status, req.user.id]
    );

    await client.query('COMMIT');
    return res.json(updated.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackErr) {
      // ignore rollback error
    }
    return next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  createApplication,
  listApplications,
  getApplicationHistory,
  updateApplicationStatus,
};
