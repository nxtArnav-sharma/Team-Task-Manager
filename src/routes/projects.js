const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

router.get('/', projectController.getProjects);
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  validate
], projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
