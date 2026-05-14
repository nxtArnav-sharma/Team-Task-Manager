let currentUser = null;
let currentProject = null;
let projects = [];

async function api(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
}

async function requireAuth() {
  try {
    currentUser = await api('GET', '/auth/me');
    document.getElementById('user-name')?.textContent = currentUser.name;
  } catch (err) {
    window.location.href = '/login';
  }
}

function showModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// Close modals on outside click or Escape
window.onclick = (e) => {
  if (e.target.classList.contains('modal')) e.target.style.display = 'none';
};
window.onkeydown = (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.querySelector('.panel').classList.remove('open');
  }
};

async function loadSidebar() {
  try {
    projects = await api('GET', '/projects');
    const list = document.getElementById('sidebar-project-list');
    if (!list) return;
    list.innerHTML = projects.map(p => `
      <li><a href="/project/${p.id}" class="${currentProject?.id === p.id ? 'active' : ''}">${p.name}</a></li>
    `).join('');
  } catch (err) {
    console.error('Failed to load projects');
  }
}

async function initDashboard() {
  await requireAuth();
  await loadSidebar();
  try {
    const stats = await api('GET', '/tasks/dashboard');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-done').textContent = stats.done;
    document.getElementById('stat-progress').textContent = stats.inProgress;
    document.getElementById('stat-overdue').textContent = stats.overdue;

    const myTasks = await api('GET', '/tasks/my');
    const tableBody = document.getElementById('my-tasks-body');
    const now = new Date();
    
    tableBody.innerHTML = myTasks.map(t => {
      const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE';
      return `
        <tr class="${isOverdue ? 'overdue' : ''}">
          <td>${t.title}</td>
          <td>${t.project.name}</td>
          <td><span class="badge badge-${t.status.toLowerCase()}"><span class="badge-dot"></span>${t.status}</span></td>
          <td>${t.priority}</td>
          <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    alert('Failed to load dashboard data');
  }
}

async function initProject() {
  await requireAuth();
  await loadSidebar();
  
  const projectId = window.location.pathname.split('/').pop();
  try {
    currentProject = await api('GET', `/projects/${projectId}`);
    document.getElementById('project-name').textContent = currentProject.name;
    document.getElementById('project-desc').textContent = currentProject.description || '';

    const member = currentProject.members.find(m => m.userId === currentUser.id);
    const isAdmin = member?.role === 'ADMIN';

    if (isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    }

    renderTasks(currentProject.tasks);
  } catch (err) {
    alert('Failed to load project');
    window.location.href = '/dashboard';
  }
}

function renderTasks(tasks) {
  const columns = {
    'TODO': document.getElementById('col-todo'),
    'IN_PROGRESS': document.getElementById('col-progress'),
    'DONE': document.getElementById('col-done')
  };

  Object.values(columns).forEach(col => col.innerHTML = '');

  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.onclick = () => openTaskPanel(t);
    card.innerHTML = `
      <h4>${t.title}</h4>
      <div class="task-meta">
        <span class="badge">${t.priority}</span>
        <span>${t.assignee ? t.assignee.name.split(' ').map(n => n[0]).join('') : '??'}</span>
      </div>
    `;
    columns[t.status].appendChild(card);
  });
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
  const isAssignee = task.assigneeId === currentUser.id;

  // Disable fields if not admin
  const adminFields = ['edit-task-title', 'edit-task-desc', 'edit-task-priority', 'edit-task-due', 'edit-task-assignee'];
  adminFields.forEach(id => {
    document.getElementById(id).disabled = !isAdmin;
  });

  const saveBtn = document.getElementById('save-task-btn');
  saveBtn.onclick = async () => {
    try {
      const body = {
        status: document.getElementById('edit-task-status').value
      };
      if (isAdmin) {
        body.title = document.getElementById('edit-task-title').value;
        body.description = document.getElementById('edit-task-desc').value;
        body.priority = document.getElementById('edit-task-priority').value;
        body.dueDate = document.getElementById('edit-task-due').value;
        body.assigneeId = parseInt(assigneeSelect.value) || null;
      }
      await api('PUT', `/tasks/${task.id}`, body);
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteBtn = document.getElementById('delete-task-btn');
  deleteBtn.style.display = isAdmin ? 'block' : 'none';
  deleteBtn.onclick = async () => {
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
  try {
    const project = await api('POST', '/projects', { name, description });
    window.location.href = `/project/${project.id}`;
  } catch (err) {
    alert(err.message);
  }
}

async function handleAddTask(e) {
  e.preventDefault();
  const projectId = currentProject.id;
  const body = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    priority: document.getElementById('task-priority').value,
    dueDate: document.getElementById('task-due').value,
    assigneeId: parseInt(document.getElementById('task-assignee').value) || null
  };
  try {
    await api('POST', `/tasks/project/${projectId}`, body);
    location.reload();
  } catch (err) {
    alert(err.message);
  }
}

async function handleInviteMember(e) {
  e.preventDefault();
  const email = document.getElementById('invite-email').value;
  try {
    await api('POST', `/members/project/${currentProject.id}/invite`, { email });
    alert('Member invited');
    location.reload();
  } catch (err) {
    alert(err.message);
  }
}

async function logout() {
  await api('POST', '/auth/logout');
  window.location.href = '/login';
}
