
(function () {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const form = document.getElementById('todo-form');
  const tasksContainer = document.getElementById('tasks-container');
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterPriority = document.getElementById('filter-priority');
  const filterTag = document.getElementById('filter-tag');
  const newTagInput = document.getElementById('new-tag');
  const addTagBtn = document.getElementById('add-tag-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  
  // 新增：获取导出按钮元素
  const exportCsvBtn = document.getElementById('export-csv-btn'); // 导出csv
  const exportJsonBtn = document.getElementById('export-json-btn'); // 导出json
  const importFileInput = document.getElementById('import-file'); // 导入json

  // 初始化标签筛选下拉框
  function initTagFilter() {
    const allTags = new Set();
    tasks.forEach(task => task.tags.forEach(tag => allTags.add(tag)));
    filterTag.innerHTML = '<option value="">全部标签</option>';
    [...allTags].forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      filterTag.appendChild(option);
    });
  }


  // 更新统计数据
  function updateStats() {
    const total = tasks.length;
    const notStarted = tasks.filter(t => t.status === '未开始').length;
    const completed = tasks.filter(t => t.status === '已完成').length;
    const inProgress = tasks.filter(t => t.status === '进行中').length;
    const publishing = tasks.filter(t => t.status === '待发布').length;
    const overdue = tasks.filter(t => t.status === '已逾期').length;

    document.getElementById('total-count').textContent = total;
    document.getElementById('not-started-count').textContent = notStarted;
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('publish-count').textContent = publishing;
    document.getElementById('in-progress-count').textContent = inProgress;
    document.getElementById('overdue-count').textContent = overdue;
  }

  // 获取状态排序权重
  function getStatusWeight(status) {
    switch(status) {
      case '已逾期': return 1;
      case '进行中': return 2;
      case '未开始': return 3;
      case '待发布': return 4;
      case '已完成': return 5;
      default: return 99;
    }
  }

  // 渲染任务列表
  function renderTasks() {
    const keyword = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const priorityFilter = filterPriority.value;
    const tagFilter = filterTag.value;

    const filteredTasks = tasks.filter(task => {
      const matchesKeyword = task.title.toLowerCase().includes(keyword) || 
                            (task.description && task.description.toLowerCase().includes(keyword));
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      const matchesTag = !tagFilter || task.tags.includes(tagFilter);
      // taskIds.push(task.id); // 获取taskId并存储
      return matchesKeyword && matchesStatus && matchesPriority && matchesTag;
    });

    // 排序：首先按状态（进行中>未开始>待发布>已逾期>已完成），相同状态下按计划日期升序
    filteredTasks.sort((a, b) => {
      const statusWeightA = getStatusWeight(a.status);
      const statusWeightB = getStatusWeight(b.status);
      
      if (statusWeightA !== statusWeightB) {
        return statusWeightA - statusWeightB;
      }
      
      // 相同状态下按计划结束日期升序，如果没有计划结束日期则按实际结束日期，如果没有实际结束日期则按计划开始日期
      const dateA = a.planEnd || a.actualEnd || a.planStart || '';
      const dateB = b.planEnd || b.actualEnd || b.planStart || '';
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA.localeCompare(dateB);
    });

    tasksContainer.innerHTML = filteredTasks.length
      ? filteredTasks.map(task => `
        <div class="task-card border rounded p-3 ${getStatusClass(task.status)}">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-start flex-wrap gap-2 mb-1">
                <h3 class="font-medium text-base">${task.title}</h3>
                <div class="flex items-center gap-1 flex-wrap">
                  <span class="priority-${task.priority === '高' ? 'high' : task.priority === '中' ? 'medium' : 'low'} px-2 py-1 rounded text-xs">${task.priority}</span>
                  <span class="status-${getStatusClass(task.status)} px-2 py-1 rounded text-xs">${task.status}</span>
                  <div class="flex flex-wrap gap-1 ml-1">
                    ${task.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
                  </div>
                </div>
              </div>
              ${task.description ? `<p class="description-text mt-1">${task.description}</p>` : ''}
              <div class="mt-2 text-xs text-gray-500 grid grid-cols-1 md:grid-cols-2 gap-1">
                <p><i class="far fa-calendar-alt mr-1"></i>计划：${task.planStart || '未设置'} 至 ${task.planEnd || '未设置'}</p>
                <p><i class="fas fa-calendar-check mr-1"></i>实际：${task.actualStart || '未开始'} 至 ${task.actualEnd || '未结束'}</p>
              </div>
            </div>
            <div class="flex flex-col space-y-1 ml-3">
              <button class="edit-btn text-indigo-600 hover:text-indigo-800 text-sm whitespace-nowrap" data-id="${task.id}"><i class="fas fa-edit"></i> 编辑</button>
              <button class="delete-btn text-red-600 hover:text-red-800 text-sm whitespace-nowrap" data-id="${task.id}"><i class="fas fa-trash"></i> 删除</button>
            <button class="toggle-btn text-green-600 hover:text-green-800 text-sm" data-id="${task.id}">
              <i class="fas fa-check-circle"></i> 
              ${
                task.status === '已完成' ? '取消完成' : 
                task.status === '待发布' ? '标记完成' : 
                task.status === '进行中' ? '标记待发布' : 
                task.status === '未开始' ? '开始任务' : '标记进行中'
              }
            </button>
            </div>
          </div>
        </div>
      `).join('')
      : '<p class="text-gray-500 text-center py-6">暂无匹配任务</p>';

    bindTaskActions();
  }

  // 获取状态对应的CSS类名
  function getStatusClass(status) {
    switch(status) {
      case '未开始': return 'status-not-started';
      case '已完成': return 'status-completed';
      case '进行中': return 'status-in-progress';
      case '待发布': return 'status-publish';
      case '已逾期': return 'status-overdue';
      default: return 'status-not-started';
    }
  }

  // 绑定任务操作按钮事件
  function bindTaskActions() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (task) fillForm(task);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        if (confirm('确认删除该任务？')) {
          const index = tasks.findIndex(t => t.id === id);
          if (index !== -1) {
            tasks.splice(index, 1);
            saveAndRefresh();
          }
        }
      });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const task = tasks.find(t => t.id === id);
        if (task) {
          // 状态转换逻辑
          if (task.status === '未开始') {
            task.status = '进行中';
            task.actualStart = task.actualStart || new Date().toISOString().split('T');
          } else if (task.status === '进行中') {
            task.status = '待发布';
            task.actualEnd = task.actualEnd || new Date().toISOString().split('T');
          } else if (task.status === '待发布') {
            task.status = '已完成';
            task.actualEnd = task.actualEnd || new Date().toISOString().split('T');
          } else if (task.status === '已完成') {
            task.status = '进行中';
            task.actualEnd = '';
          } else if (task.status === '已逾期') {
            task.status = '已完成';
            task.actualEnd = task.actualEnd || new Date().toISOString().split('T');
          }
          saveAndRefresh();
        }
      });
    });
  }

  // 填充表单用于编辑
  function fillForm(task) {
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('plan-start').value = task.planStart || '';
    document.getElementById('plan-end').value = task.planEnd || '';
    document.getElementById('actual-start').value = task.actualStart || '';
    document.getElementById('actual-end').value = task.actualEnd || '';

    // 重置所有复选框
    document.querySelectorAll('.tag-checkbox').forEach(cb => cb.checked = false);
    
    // 设置标签选中状态
    task.tags.forEach(tag => {
      const checkbox = document.querySelector(`.tag-checkbox[value="${tag}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }

  // 保存并刷新页面
  function saveAndRefresh() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
    updateStats();
    initTagFilter();
  }

  // 表单提交事件
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const priority = document.getElementById('task-priority').value;
    const planStart = document.getElementById('plan-start').value;
    const planEnd = document.getElementById('plan-end').value;
    const actualStart = document.getElementById('actual-start').value;
    const actualEnd = document.getElementById('actual-end').value;
    const tags = [...document.querySelectorAll('.tag-checkbox:checked')].map(cb => cb.value);

    if (!title) {
      alert('请输入任务名称');
      return;
    }

    function getTaskId(id) {
      let num = tasks.findIndex(parseInt(id));
      alert("序号：" + num);
    }


    // // 根据实际完成时间自动判断状态
    let status = '未开始';

    const taskData = {
      // id,
      title,
      description,
      priority,
      status,
      planStart,
      planEnd,
      actualStart,
      actualEnd,
      tags
    };

    // 计算任务状态
    recalculateStatus(taskData);

    // 新增/修改任务
    dealTask(id,taskData);

    // if (id) {
    //   // 编辑任务
    //   const index = tasks.findIndex(t => t.id === parseInt(id));
    //   if (index !== -1) {
    //     taskData.id = parseInt(id);
    //     tasks[index] = taskData;
    //   }
    // } else {
    //   // 新增任务
    //   taskData.id = Date.now();
    //   tasks.push(taskData);
    // }

    form.reset();
    document.getElementById('task-id').value = '';
    saveAndRefresh();
  });
  
  
  // 任务处理。判断是添加任务还是更新任务
  function dealTask(id,taskData) {
    // getTaskId(id);
    if (id) {
      // 编辑任务
      const index = tasks.findIndex(t => t.id === parseInt(id));
      if (index !== -1) {
        taskData.id = parseInt(id);
        tasks[index] = taskData;
      }
    } else {
      // 新增任务
      taskData.id = Date.now();
      tasks.push(taskData);
    }
  };

  // 取消编辑
  cancelBtn.addEventListener('click', function() {
    form.reset();
    document.getElementById('task-id').value = '';
  });

  // 添加自定义标签
  addTagBtn.addEventListener('click', () => {
    const tag = newTagInput.value.trim();
    if (tag && !document.querySelector(`.tag-checkbox[value="${tag}"]`)) {
      const container = document.getElementById('tag-checkboxes');
      const label = document.createElement('label');
      label.className = 'inline-flex items-center';
      label.innerHTML = `<input type="checkbox" value="${tag}" class="tag-checkbox"> ${tag}`;
      container.appendChild(label);
      newTagInput.value = '';
    }
  });

  // 搜索与筛选事件
  [searchInput, filterStatus, filterPriority, filterTag].forEach(el => {
    el.addEventListener('input', renderTasks);
  });

  // --- 新增：导出功能 ---

  // 导出为 CSV
  function exportToCSV() {
    if (tasks.length === 0) {
      alert('当前没有任务可导出');
      return;
    }

    // CSV 表头
    const headers = ['ID', '任务名称', '任务详情', '优先级', '状态', '计划开始', '计划结束', '实际开始', '实际结束', '标签'];
    
    // 构建 CSV 内容
    const csvRows = [];
    csvRows.push(headers.join(','));

    tasks.forEach(task => {
      // 处理可能包含逗号或换行符的字段，用双引号包裹
      const row = [
        task.id,
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        task.priority,
        task.status,
        task.planStart || '',
        task.planEnd || '',
        task.actualStart || '',
        task.actualEnd || '',
        `"${task.tags.join(';')}"` // 标签用分号分隔
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    // 添加 BOM 以解决 Excel 打开中文乱码问题
    const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 导出为 JSON
  function exportToJSON() {
    if (tasks.length === 0) {
      alert('当前没有任务可导出');
      return;
    }
    const jsonStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_backup_${new Date().toISOString().slice(0,10)}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- 新增：导入功能 ---
  function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedTasks = JSON.parse(e.target.result);
        if (!Array.isArray(importedTasks)) {
          throw new Error('文件格式不正确，应为任务数组');
        }

        // 简单验证数据结构
        const validTasks = importedTasks.filter(task => 
          task && typeof task === 'object' && task.title
        );

        if (validTasks.length === 0) {
          alert('文件中没有有效的任务数据');
          return;
        }

        // 确认是否覆盖或追加
        const action = confirm(`发现 ${validTasks.length} 个有效任务。\n点击“确定”更新到现有列表，点击“取消”退出导入。`);
        
        if (action) {
          // 追加模式：重新生成ID以避免冲突
          validTasks.forEach(task => {
            recalculateStatus(task); // 计算任务状态
            dealTask(task.id,task);
            // tasks.push(task);
          });
          alert('导入成功！');
        } else {
          
        }

        saveAndRefresh();
      } catch (error) {
        console.error(error);
        alert('导入失败：' + error.message);
      } finally {
        // 清空input以便下次能选择同一文件
        importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  }


  // 辅助函数：计算任务状态
  function recalculateStatus(task) {
    if (task.status == '已完成') {
      task.status = '已完成'
    } else if (task.actualEnd) {
      task.status = '待发布';
    } else if (task.actualStart) {
      task.status = '进行中';
    } else if (task.planEnd) {
      const today = new Date().toISOString().split('T')[0];
      if (task.planEnd < today) {
        task.status = '已逾期';
      } else {
        task.status = '未开始';
      }
    } else {
      task.status = '未开始';
    }
  }

  // 绑定导出按钮事件
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);
  if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportToJSON);
  if (importFileInput) importFileInput.addEventListener('change', importFromJSON);

  // 初始化
  updateStats();
  initTagFilter();
  renderTasks();
})();
