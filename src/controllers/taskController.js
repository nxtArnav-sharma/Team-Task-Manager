const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createTask = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { title, description, priority, dueDate, assigneeId } = req.body;

    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } }
    });

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    if (assigneeId) {
      const isAssigneeMember = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: assigneeId, projectId } }
      });
      if (!isAssigneeMember) {
        return res.status(400).json({ success: false, message: 'Assignee must be a project member' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        creatorId: req.user.userId,
        assigneeId
      }
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

const getTasksByProject = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } }
    });

    if (!member) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: { assignee: { select: { name: true } } }
    });

    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId: task.projectId } }
    });

    const isAdmin = member && member.role === 'ADMIN';
    const isAssignee = task.assigneeId === req.user.userId;

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!isAdmin && (title || description || priority || dueDate || assigneeId)) {
      return res.status(403).json({ success: false, message: 'Members can only update status' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: isAdmin ? title : undefined,
        description: isAdmin ? description : undefined,
        status,
        priority: isAdmin ? priority : undefined,
        dueDate: (isAdmin && dueDate) ? new Date(dueDate) : undefined,
        assigneeId: isAdmin ? assigneeId : undefined
      }
    });

    res.json({ success: true, data: updatedTask });
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const member = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId: task.projectId } }
    });

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: req.user.userId },
      include: { project: { select: { name: true } } }
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: { assigneeId: userId }
    });

    const stats = {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'DONE').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      overdue: tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'DONE').length
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, getTasksByProject, updateTask, deleteTask, getMyTasks, getDashboardStats };
