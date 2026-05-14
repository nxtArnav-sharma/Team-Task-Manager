const express = require('express');
const { body } = require('express-validator');
const memberController = require('../controllers/memberController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

router.post('/project/:projectId/invite', [
  body('email').isEmail().withMessage('Invalid email'),
  validate
], memberController.inviteByEmail);

router.delete('/project/:projectId/remove/:userId', memberController.removeMember);
router.put('/project/:projectId/role/:userId', memberController.changeRole);

module.exports = router;
