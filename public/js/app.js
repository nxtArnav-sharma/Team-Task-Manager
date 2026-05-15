let currentUser = null;
let currentProject = null;
let projects = [];

async function api(method, path, body) {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  } catch (err) {
    console.error(`API Error (${path}):`, err);
    throw err;
  }
}

async function requireAuth() {
  try {
    currentUser = await api('GET', '/auth/me');
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-email').textContent = currentUser.email;
  } catch (err) {
    window.location.href = '/';
  }
}

async function logout() {
  await api('POST', '/auth/logout');
  window.location.href = '/';
}

async function loadSidebar() {
  projects = await api('GET', '/projects');
  const list = document.getElementById('sidebar-project-list');
  if (!list) return;

  const currentPathId = parseInt(window.location.pathname.split('/').pop());

  list.innerHTML = `
    <h4 style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 12px; color: var(--muted); margin-top: 24px;">Projects</h4>
    ${projects.map(p => {
      const member = (p.members || []).find(m => m.userId === currentUser.id);
      const isAdmin = member?.role === 'ADMIN';
      const doneTasks = (p.tasks || []).filter(t => t.status === 'DONE').length;
      const totalTasks = (p.tasks || []).length;
      const isActive = currentPathId === p.id;
      
      return `
        <a href="/project/${p.id}" class="project-item ${isActive ? 'active' : ''}">
          <h4 style="font-weight: 600;">${p.name}</h4>
          <span style="color: var(--muted); font-size: 0.75rem;">${isAdmin ? 'Admin' : 'Member'} • ${doneTasks}/${totalTasks} done</span>
        </a>
      `;
    }).join('')}
  `;
}

async function initDashboard() {
  await requireAuth();
  await loadSidebar();
  
  const path = window.location.pathname;
  if (path.startsWith('/project/')) {
    const projectId = path.split('/').pop();
    await loadProject(projectId);
  } else {
    document.getElementById('empty-view').style.display = 'block';
    document.getElementById('project-view').style.display = 'none';
    await loadGlobalStats();
  }
}

async function loadGlobalStats() {
  const stats = await api('GET', '/tasks/dashboard');
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-done').textContent = stats.done;
  document.getElementById('stat-progress').textContent = stats.inProgress;
  document.getElementById('stat-overdue').textContent = stats.overdue;
  
  const myTasks = await api('GET', '/tasks/my');
  const perUser = document.getElementById('stat-per-user');
  if (perUser) {
    perUser.innerHTML = `You have <strong>${myTasks.length}</strong> tasks assigned.`;
  }
}

async function loadProject(id) {
  try {
    currentProject = await api('GET', `/projects/${id}`);
    document.getElementById('empty-view').style.display = 'none';
    document.getElementById('project-view').style.display = 'block';
    document.getElementById('project-right-panel').style.display = 'block';

    document.getElementById('project-name').textContent = currentProject.name;
    
    const member = currentProject.members.find(m => m.userId === currentUser.id);
    const isAdmin = member?.role === 'ADMIN';
    
    document.getElementById('role-badge').textContent = isAdmin ? 'ADMIN WORKSPACE' : 'TEAM WORKSPACE';
    document.getElementById('admin-indicator').style.display = isAdmin ? 'flex' : 'none';

    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? 'block' : 'none';
    });

    renderBoard(currentProject.tasks);
    renderTeam(currentProject.members);
    updateProjectStats(currentProject.tasks);
    
    const assigneeSelect = document.getElementById('task-assignee');
    if (assigneeSelect) {
      assigneeSelect.innerHTML = '<option value="">Unassigned</option>' + 
        currentProject.members.map(m => `<option value="${m.userId}">${m.user.name}</option>`).join('');
    }

  } catch (err) {
    window.location.href = '/dashboard';
  }
}

function updateProjectStats(tasks) {
  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE').length,
    progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length
  };
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-done').textContent = stats.done;
  document.getElementById('stat-progress').textContent = stats.progress;
  document.getElementById('stat-overdue').textContent = stats.overdue;
}

function renderBoard(tasks) {
  const groups = { 'TODO': [], 'IN_PROGRESS': [], 'DONE': [] };
  tasks.forEach(t => groups[t.status].push(t));

  for (const [status, list] of Object.entries(groups)) {
    const container = document.getElementById(`col-${status.toLowerCase().replace('_', '-')}`);
    const countEl = document.getElementById(`count-${status.toLowerCase().replace('_', '-')}`);
    if (!container) continue;

    countEl.textContent = list.length;
    container.innerHTML = list.map(t => {
      const initials = t.assignee ? t.assignee.name.split(' ').map(n => n[0]).join('') : '??';
      return `
        <div class="task-card" onclick='openTaskPanel(${JSON.stringify(t)})'>
          <h4 style="margin-bottom: 12px; font-weight: 600;">${t.title}</h4>
          <div style="display: flex; justify-content: space-between; align-items: center;">
             <span style="font-size: 0.65rem; font-weight: 800; color: var(--muted); border: 1px solid var(--border); padding: 2px 6px; border-radius: 4px;">${t.priority}</span>
             <div style="width: 24px; height: 24px; background: #eef2f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; border: 1px solid var(--border);" title="${t.assignee?.name || 'Unassigned'}">
               ${initials}
             </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderTeam(members) {
  const container = document.getElementById('project-team-list');
  if (!container) return;
  container.innerHTML = members.map(m => `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.85rem;">
      <div>
        <div style="font-weight: 600;">${m.user.name}</div>
        <div style="font-size: 0.75rem; color: var(--muted);">${m.user.email}</div>
      </div>
      <span style="font-size: 0.6rem; font-weight: 800; color: ${m.role === 'ADMIN' ? 'var(--success)' : 'var(--muted)'}; border: 1px solid var(--border); padding: 1px 4px; border-radius: 4px;">${m.role}</span>
    </div>
  `).join('');
}

async function openTaskPanel(task) {
  const panel = document.getElementById('task-panel');
  panel.classList.add('open');
  
  document.getElementById('edit-task-title').value = task.title;
  document.getElementById('edit-task-desc').value = task.description || '';
  document.getElementById('edit-task-status').value = task.status;
  document.getElementById('edit-task-priority').value = task.priority;
  document.getElementById('edit-task-due').value = task.dueDate ? task.dueDate.split('T')[0] : '';
  
  const assigneeSelect = document.getElementById('edit-task-assignee');
  assigneeSelect.innerHTML = '<option value="">Unassigned</option>' + 
    currentProject.members.map(m => `
      <option value="${m.userId}" ${m.userId === task.assigneeId ? 'selected' : ''}>${m.user.name}</option>
    `).join('');

  const isAdmin = currentProject.members.find(m => m.userId === currentUser.id)?.role === 'ADMIN';

  const adminFields = ['edit-task-title', 'edit-task-desc', 'edit-task-priority', 'edit-task-due', 'edit-task-assignee'];
  adminFields.forEach(id => {
    document.getElementById(id).disabled = !isAdmin;
  });

  document.getElementById('save-task-btn').onclick = async () => {
    const body = { status: document.getElementById('edit-task-status').value };
    if (isAdmin) {
      body.title = document.getElementById('edit-task-title').value;
      body.description = document.getElementById('edit-task-desc').value;
      body.priority = document.getElementById('edit-task-priority').value;
      body.dueDate = document.getElementById('edit-task-due').value;
      body.assigneeId = parseInt(assigneeSelect.value) || null;
    }
    await api('PUT', `/tasks/${task.id}`, body);
    location.reload();
  };

  document.getElementById('delete-task-btn').onclick = async () => {
    if (confirm('Delete task?')) {
      await api('DELETE', `/tasks/${task.id}`);
      location.reload();
    }
  };
}

async function handleCreateProject(e) {
  e.preventDefault();
  const name = document.getElementById('new-project-name').value;
  const description = document.getElementById('new-project-desc').value;
  const project = await api('POST', '/projects', { name, description });
  window.location.href = `/project/${project.id}`;
}

async function handleAddTask(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    priority: document.getElementById('task-priority').value,
    dueDate: document.getElementById('task-due').value,
    assigneeId: parseInt(document.getElementById('task-assignee').value) || null
  };
  await api('POST', `/tasks/project/${currentProject.id}`, body);
  location.reload();
}

async function handleInviteMember(e) {
  e.preventDefault();
  const email = document.getElementById('invite-email').value;
  await api('POST', `/members/project/${currentProject.id}/invite`, { email });
  alert('Member added to project');
  location.reload();
}
