const { Router } = require('express');
const {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require('../controllers/servicesController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', listServices);
router.get('/:id', getService);
router.post('/', requireAuth, requireAdmin, createService);
router.put('/:id', requireAuth, requireAdmin, updateService);
router.delete('/:id', requireAuth, requireAdmin, deleteService);

module.exports = router;
