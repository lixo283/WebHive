const { Router } = require('express');
const {
  listPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} = require('../controllers/portfolioController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', listPortfolio);
router.post('/', requireAuth, requireAdmin, createPortfolio);
router.put('/:id', requireAuth, requireAdmin, updatePortfolio);
router.delete('/:id', requireAuth, requireAdmin, deletePortfolio);

module.exports = router;
