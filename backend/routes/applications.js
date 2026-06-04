const { Router } = require('express');
const {
  createApplication,
  listApplications,
  getApplicationHistory,
  updateApplicationStatus,
} = require('../controllers/applicationsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.post('/', requireAuth, createApplication);
router.get('/', requireAuth, listApplications);
router.get('/:id/history', requireAuth, getApplicationHistory);
router.patch('/:id/status', requireAuth, requireAdmin, updateApplicationStatus);

module.exports = router;
