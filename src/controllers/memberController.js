const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const inviteByEmail = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { email } = req.body;

    const adminMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } }
    });

    if (!adminMember || adminMember.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const userToInvite = await prisma.user.findUnique({ where: { email } });
    if (!userToInvite) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: userToInvite.id, projectId } }
    });

    if (existingMember) {
      return res.status(409).json({ success: false, message: 'User is already a member' });
    }

    const newMember = await prisma.projectMember.create({
      data: {
        userId: userToInvite.id,
        projectId,
        role: 'MEMBER'
      }
    });

    res.status(201).json({ success: true, data: newMember });
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = parseInt(req.params.userId);

    const adminMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } }
    });

    if (!adminMember || adminMember.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove yourself' });
    }

    await prisma.projectMember.delete({
      where: { userId_projectId: { userId, projectId } }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const changeRole = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = parseInt(req.params.userId);
    const { role } = req.body;

    const adminMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } }
    });

    if (!adminMember || adminMember.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const updatedMember = await prisma.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      data: { role }
    });

    res.json({ success: true, data: updatedMember });
  } catch (err) {
    next(err);
  }
};

module.exports = { inviteByEmail, removeMember, changeRole };
