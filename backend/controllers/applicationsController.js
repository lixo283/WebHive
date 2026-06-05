const pool = require('../db/pool');

const VALID_STATUSES = new Set(['new', 'work', 'done']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ADMIN_NOTE_LENGTH = 1000;

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function getRussianPhoneLocalDigits(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return digits.slice(1);
  }

  return null;
}

function formatRussianPhone(localDigits) {
  return `+7 (${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)} ${localDigits.slice(6, 8)} ${localDigits.slice(8, 10)}`;
}

function normalizeRussianPhone(value) {
  const localDigits = getRussianPhoneLocalDigits(value);
  if (!localDigits) return null;
  return formatRussianPhone(localDigits);
}

function parseFinalPrice(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999.99) {
    return undefined;
  }
  return Math.round(amount * 100) / 100;
}

function normalizeAdminNote(value) {
  const note = String(value ?? '').trim();
  if (!note) return null;
  return note;
}

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
    const normalizedPhone = normalizeRussianPhone(contact_phone);
    const normalizedComment = String(comment || '').trim();

    if (normalizedName.length < 2) {
      return res.status(400).json({ error: 'contact_name must contain at least 2 characters' });
    }
    if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: 'contact_email must be a valid email address' });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'contact_phone must match +7 (999) 999 99 99' });
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
       RETURNING id, user_id, service_id, status, contact_name, contact_email, contact_phone, comment, final_price, admin_note, status_updated_at, updated_at, created_at`,
      [req.user.id, serviceId, normalizedName, normalizedEmail, normalizedPhone, normalizedComment || null]
    );

    await client.query(
      `INSERT INTO application_status_history (application_id, old_status, new_status, changed_by_user_id)
       VALUES ($1, NULL, $2, $3)`,
      [created.rows[0].id, created.rows[0].status, req.user.id]
    );

    const clientNumber = await client.query(
      `SELECT COUNT(*)::int AS client_application_number
       FROM applications
       WHERE user_id = $1
         AND (
           created_at < $2
           OR (created_at = $2 AND id <= $3)
         )`,
      [req.user.id, created.rows[0].created_at, created.rows[0].id]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      ...created.rows[0],
      client_application_number: clientNumber.rows[0].client_application_number,
    });
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
      `WITH numbered_applications AS (
         SELECT
           a.*,
           (ROW_NUMBER() OVER (PARTITION BY a.user_id ORDER BY a.created_at ASC, a.id ASC))::int AS client_application_number
         FROM applications a
       )
       SELECT
         a.id,
         a.client_application_number,
         a.user_id,
         u.login,
         a.service_id,
         s.name AS service_name,
         a.status,
         a.contact_name,
         a.contact_email,
         a.contact_phone,
         a.comment,
         a.final_price,
         a.admin_note,
         a.status_updated_at,
         a.updated_at,
         a.created_at
       FROM numbered_applications a
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
    const { status, final_price, admin_note } = req.body;
    const applicationId = Number(id);

    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({ error: 'application id must be a positive integer' });
    }

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'status must be one of: new, work, done' });
    }

    await client.query('BEGIN');

    const current = await client.query(
      `SELECT id, user_id, service_id, status, contact_name, contact_email, contact_phone, comment, final_price, admin_note, status_updated_at, updated_at, created_at
       FROM applications
       WHERE id = $1`,
      [applicationId]
    );
    if (current.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'application not found' });
    }

    const currentRow = current.rows[0];
    const nextFinalPrice = hasOwn(req.body, 'final_price')
      ? parseFinalPrice(final_price)
      : currentRow.final_price;
    if (nextFinalPrice === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'final_price must be a positive number or empty' });
    }

    const nextAdminNote = hasOwn(req.body, 'admin_note')
      ? normalizeAdminNote(admin_note)
      : currentRow.admin_note;
    if (nextAdminNote && nextAdminNote.length > MAX_ADMIN_NOTE_LENGTH) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'admin_note must contain at most 1000 characters' });
    }

    const updated = await client.query(
      `UPDATE applications
       SET status = $1,
           final_price = $2,
           admin_note = $3,
           status_updated_at = CASE
             WHEN status <> $1 THEN NOW()
             ELSE status_updated_at
           END,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, user_id, service_id, status, contact_name, contact_email, contact_phone, comment, final_price, admin_note, status_updated_at, updated_at, created_at`,
      [status, nextFinalPrice, nextAdminNote, applicationId]
    );

    if (currentRow.status !== status) {
      await client.query(
        `INSERT INTO application_status_history (application_id, old_status, new_status, changed_by_user_id)
         VALUES ($1, $2, $3, $4)`,
        [applicationId, currentRow.status, status, req.user.id]
      );
    }

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
