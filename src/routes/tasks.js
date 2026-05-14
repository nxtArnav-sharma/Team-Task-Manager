const express = require('express');
const { body } = require('express-validator');
const taskController = require('../controllers/taskController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(auth);

router.post('/project/:projectId', [
  body('title').notEmpty().withMessage('Title is required'),
  validate
], taskController.createTask);

router.get('/project/:projectId', taskController.getTasksByProject);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.get('/my', taskController.getMyTasks);
router.get('/dashboard', taskController.getDashboardStats);

module.exports = router;
