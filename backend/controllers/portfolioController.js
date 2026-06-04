const pool = require('../db/pool');

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeImageUrl(value) {
  const imageUrl = String(value || '').trim();
  if (imageUrl.length > 500) return null;
  if (/^\/?assets\/img\/[a-z0-9 _./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(imageUrl)) return imageUrl;

  try {
    const parsed = new URL(imageUrl);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch (_err) {
    return null;
  }
}

function normalizePortfolio(body) {
  const title = String(body.title || '').trim();
  const imageUrl = normalizeImageUrl(body.image_url);
  const description = String(body.description || '').trim();
  const rawServiceId = body.service_id;
  const serviceId = rawServiceId === null || rawServiceId === undefined || rawServiceId === ''
    ? null
    : parsePositiveInteger(rawServiceId);

  if (title.length < 2 || title.length > 255) {
    return { error: 'title must contain 2-255 characters' };
  }
  if (!imageUrl) {
    return { error: 'image_url must be an assets/img path or HTTP(S) URL' };
  }
  if (description.length < 10 || description.length > 2000) {
    return { error: 'description must contain 10-2000 characters' };
  }
  if (rawServiceId !== null && rawServiceId !== undefined && rawServiceId !== '' && !serviceId) {
    return { error: 'service_id must be a positive integer or empty' };
  }

  return { value: { title, imageUrl, serviceId, description } };
}

async function listPortfolio(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.image_url, p.service_id, p.description, s.name AS service_name
       FROM portfolio p
       LEFT JOIN services s ON s.id = p.service_id
       ORDER BY p.id DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function createPortfolio(req, res, next) {
  try {
    const normalized = normalizePortfolio(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }
    const { title, imageUrl, serviceId, description } = normalized.value;
    if (serviceId) {
      const serviceExists = await pool.query('SELECT id FROM services WHERE id = $1 LIMIT 1', [serviceId]);
      if (serviceExists.rowCount === 0) {
        return res.status(400).json({ error: 'service_id does not exist' });
      }
    }

    const created = await pool.query(
      `INSERT INTO portfolio (title, image_url, service_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, image_url, service_id, description`,
      [title, imageUrl, serviceId, description]
    );

    return res.status(201).json(created.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function updatePortfolio(req, res, next) {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'portfolio id must be a positive integer' });
    }
    const normalized = normalizePortfolio(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }
    const { title, imageUrl, serviceId, description } = normalized.value;
    if (serviceId) {
      const serviceExists = await pool.query('SELECT id FROM services WHERE id = $1 LIMIT 1', [serviceId]);
      if (serviceExists.rowCount === 0) {
        return res.status(400).json({ error: 'service_id does not exist' });
      }
    }

    const updated = await pool.query(
      `UPDATE portfolio
       SET title = $1, image_url = $2, service_id = $3, description = $4
       WHERE id = $5
       RETURNING id, title, image_url, service_id, description`,
      [title, imageUrl, serviceId, description, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: 'portfolio item not found' });
    }

    return res.json(updated.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function deletePortfolio(req, res, next) {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'portfolio id must be a positive integer' });
    }
    const deleted = await pool.query('DELETE FROM portfolio WHERE id = $1 RETURNING id', [id]);

    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: 'portfolio item not found' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
};
