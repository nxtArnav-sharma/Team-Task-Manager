const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId: req.user.userId }
        }
      },
      include: {
        members: true,
        tasks: { select: { status: true } }
      }
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user.userId,
        members: {
          create: { userId: req.user.userId, role: 'ADMIN' }
        }
      }
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

const getProject = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: req.user.userId,
          projectId: projectId
        }
      }
    });

    if (!member) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        },
        tasks: {
          include: { assignee: { select: { name: true } } }
        }
      }
    });

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const { name, description } = req.body;

    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: req.user.userId, projectId }
      }
    });

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name, description }
    });

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);

    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: { userId: req.user.userId, projectId }
      }
    });

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };
