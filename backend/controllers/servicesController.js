const pool = require('../db/pool');

const VALID_CATEGORIES = new Set(['Landing', 'Corporate', 'Store', 'Design', 'Brand', 'Support']);

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalPrice(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function normalizeService(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const description = String(body.description || '').trim();
  const price = Number(body.price);

  if (name.length < 3 || name.length > 255) {
    return { error: 'name must contain 3-255 characters' };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: 'price must be a positive number' };
  }
  if (!VALID_CATEGORIES.has(category)) {
    return { error: 'category is invalid' };
  }
  if (description.length < 10 || description.length > 2000) {
    return { error: 'description must contain 10-2000 characters' };
  }

  return { value: { name, price, category, description } };
}

async function listServices(req, res, next) {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    const minPriceValue = parseOptionalPrice(minPrice);
    const maxPriceValue = parseOptionalPrice(maxPrice);
    const normalizedSearch = String(search || '').trim();

    const where = [];
    const params = [];

    if (category) {
      if (!VALID_CATEGORIES.has(category)) {
        return res.status(400).json({ error: 'category is invalid' });
      }
      params.push(category);
      where.push(`category = $${params.length}`);
    }

    if (Number.isNaN(minPriceValue) || Number.isNaN(maxPriceValue)) {
      return res.status(400).json({ error: 'price filters must be non-negative numbers' });
    }

    if (minPriceValue !== null) {
      params.push(minPriceValue);
      where.push(`price >= $${params.length}`);
    }

    if (maxPriceValue !== null) {
      params.push(maxPriceValue);
      where.push(`price <= $${params.length}`);
    }

    if (normalizedSearch) {
      if (normalizedSearch.length > 100) {
        return res.status(400).json({ error: 'search must contain at most 100 characters' });
      }
      params.push(`%${normalizedSearch}%`);
      where.push(`(LOWER(name) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, name, price, category, description
       FROM services
       ${whereSql}
       ORDER BY id DESC`,
      params
    );

    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
}

async function getService(req, res, next) {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'service id must be a positive integer' });
    }

    const result = await pool.query(
      'SELECT id, name, price, category, description FROM services WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'service not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function createService(req, res, next) {
  try {
    const normalized = normalizeService(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }
    const { name, price, category, description } = normalized.value;

    const created = await pool.query(
      `INSERT INTO services (name, price, category, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, price, category, description`,
      [name, price, category, description]
    );

    return res.status(201).json(created.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function updateService(req, res, next) {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'service id must be a positive integer' });
    }
    const normalized = normalizeService(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }
    const { name, price, category, description } = normalized.value;

    const updated = await pool.query(
      `UPDATE services
       SET name = $1, price = $2, category = $3, description = $4
       WHERE id = $5
       RETURNING id, name, price, category, description`,
      [name, price, category, description, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: 'service not found' });
    }

    return res.json(updated.rows[0]);
  } catch (err) {
    return next(err);
  }
}

async function deleteService(req, res, next) {
  try {
    const id = parsePositiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'service id must be a positive integer' });
    }
    const deleted = await pool.query('DELETE FROM services WHERE id = $1 RETURNING id', [id]);

    if (deleted.rowCount === 0) {
      return res.status(404).json({ error: 'service not found' });
    }

    return res.json({ success: true, id });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
};
