
// 任务管理器主逻辑
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.timeChart = null;
        this.init();
    }

    init() {
        this.loadTasks();
        // this.setupEventListeners();
        // this.updateStats();
        this.initCharts();
        // this.checkOverdueTasks();
        
        // 每分钟检查一次过期任务
        // setInterval(() => this.checkOverdueTasks(), 60000);
    }

    // 初始化图表
    initCharts() {
        const timeCtx = document.getElementById('timeChart').getContext('2d');
        this.timeChart = new Chart(timeCtx, {
            type: 'bar',
            data: {
                labels: ['工作', '个人', '学习', '健康', '其他'],
                datasets: [{
                    label: '任务数量',
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#8b5cf6',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // 设置事件监听器
    setupEventListeners() {
        // 添加任务表单
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // 编辑任务表单
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateTask();
        });

        // 取消编辑
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        // 清除已完成任务
        document.getElementById('clearCompleted').addEventListener('click', () => {
            this.clearCompletedTasks();
        });

        // 筛选器
        document.getElementById('filterStatus').addEventListener('change', () => {
            this.loadTasks();
        });

        document.getElementById('filterPriority').addEventListener('change', () => {
            this.loadTasks();
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.loadTasks();
        });

        // 搜索功能
        document.getElementById('searchInput').addEventListener('input', () => {
            this.loadTasks();
        });

        // 标签建议点击
        document.querySelectorAll('.tag-suggestion').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const input = document.getElementById('customTags');
                const currentTags = input.value ? input.value.split(',').map(t => t.trim()) : [];
                const newTag = e.target.getAttribute('data-tag');
                
                if (!currentTags.includes(newTag)) {
                    currentTags.push(newTag);
                    input.value = currentTags.join(', ');
                }
            });
        });
    }

    // 添加任务
    addTask() {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const priority = document.getElementById('taskPriority').value;
        const category = document.getElementById('taskCategory').value;
        const plannedStart = document.getElementById('plannedStart').value;
        const plannedEnd = document.getElementById('plannedEnd').value;
        const customTags = document.getElementById('customTags').value.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag !== '');

        const task = {
            id: Date.now(),
            title,
            description,
            priority,
            category,
            plannedStart,
            plannedEnd,
            actualStart: '',
            actualEnd: '',
            customTags,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.loadTasks();
        this.resetForm();
    }

    // 重置表单
    resetForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('customTags').value = '';
    }

    // 加载任务列表
    loadTasks() {
        const statusFilter = document.getElementById('filterStatus').value;
        const priorityFilter = document.getElementById('filterPriority').value;
        const categoryFilter = document.getElementById('filterCategory').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        let filteredTasks = this.tasks.filter(task => {
            // 状态过滤
            if (statusFilter === 'pending' && (task.completed || task.actualStart)) return false;
            if (statusFilter === 'inprogress' && (!task.actualStart || task.completed)) return false;
            if (statusFilter === 'completed' && !task.completed) return false;
            if (statusFilter === 'overdue' && !this.isOverdue(task)) return false;

            // 优先级过滤
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

            // 分类过滤
            if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;

            // 搜索过滤
            if (searchTerm && 
                !task.title.toLowerCase().includes(searchTerm) && 
                !task.description.toLowerCase().includes(searchTerm) &&
                !task.customTags.some(tag => tag.toLowerCase().includes(searchTerm))) {
                return false;
            }

            return true;
        });

        // 按优先级和创建时间排序
        filteredTasks.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        this.renderTasks(filteredTasks);
        this.updateStats();
        this.updateCategoryChart();
    }

    // 渲染任务列表
    renderTasks(tasks) {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');

        if (tasks.length === 0) {
            taskList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        taskList.innerHTML = tasks.map(task => this.createTaskElement(task)).join('');
        
        // 绑定任务操作事件
        this.bindTaskEvents();
    }

    // 创建任务DOM元素
    createTaskElement(task) {
        const isOverdue = this.isOverdue(task);
        const priorityClass = `priority-${task.priority}`;
        const statusClass = task.completed ? 'status-completed' : 
                          isOverdue ? 'status-overdue' : 
                          task.actualStart ? 'status-inprogress' : '';
        
        const categoryMap = {
            work: '工作',
            personal: '个人',
            study: '学习',
            health: '健康',
            other: '其他'
        };
        
        const priorityMap = {
            low: '低',
            medium: '中',
            high: '高',
            urgent: '紧急'
        };

        return `
            <div class="task-item bg-white rounded-xl shadow-lg p-6 ${priorityClass} ${statusClass}" data-id="${task.id}">
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-4">
                        <button class="complete-btn mt-1 text-gray-400 hover:text-green-500 transition-colors" 
                                data-id="${task.id}" data-completed="${task.completed}">
                            <i class="fas fa-${task.completed ? 'check-circle' : 'circle'} text-xl"></i>
                        </button>
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-800 ${task.completed ? 'line-through text-gray-500' : ''}">
                                ${task.title}
                            </h3>
                            ${task.description ? `<p class="text-gray-600 mt-1">${task.description}</p>` : ''}
                            
                            <div class="mt-3 flex flex-wrap gap-2">
                                <span class="px-2 py-1 bg-${this.getCategoryColor(task.category)}-100 text-${this.getCategoryColor(task.category)}-800 rounded-full text-xs">
                                    ${categoryMap[task.category]}
                                </span>
                                <span class="px-2 py-1 bg-${this.getPriorityColor(task.priority)}-100 text-${this.getPriorityColor(task.priority)}-800 rounded-full text-xs">
                                    ${priorityMap[task.priority]}
                                </span>
                                ${task.customTags.map(tag => `
                                    <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">${tag}</span>
                                `).join('')}
                            </div>
                            
                            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                                <div>
                                    <i class="far fa-clock mr-2"></i>
                                    <span>计划: ${task.plannedStart ? this.formatDate(task.plannedStart) : '未设置'} 至 ${task.plannedEnd ? this.formatDate(task.plannedEnd) : '未设置'}</span>
                                </div>
                                ${task.actualStart || task.actualEnd ? `
                                <div>
                                    <i class="fas fa-check-circle mr-2"></i>
                                    <span>实际: ${task.actualStart ? this.formatDate(task.actualStart) : '未开始'} 至 ${task.actualEnd ? this.formatDate(task.actualEnd) : '未完成'}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            ${isOverdue && !task.completed ? `
                            <div class="mt-2 text-red-500 text-sm">
                                <i class="fas fa-exclamation-triangle mr-1"></i>已逾期
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <button class="start-btn text-gray-400 hover:text-blue-500 transition-colors" 
                                data-id="${task.id}" 
                                data-started="${!!task.actualStart}" 
                                data-completed="${task.completed}"
                                ${task.completed ? 'disabled' : ''}>
                            <i class="fas fa-${task.actualStart ? 'pause' : 'play'}-circle text-xl"></i>
                        </button>
                        <button class="edit-btn text-gray-400 hover:text-blue-500 transition-colors" data-id="${task.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn text-gray-400 hover:text-red-500 transition-colors" data-id="${task.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 获取分类颜色
    getCategoryColor(category) {
        const colorMap = {
            work: 'blue',
            personal: 'green',
            study: 'yellow',
            health: 'purple',
            other: 'red'
        };
        return colorMap[category] || 'gray';
    }

    // 获取优先级颜色
    getPriorityColor(priority) {
        const colorMap = {
            low: 'green',
            medium: 'yellow',
            high: 'orange',
            urgent: 'red'
        };
        return colorMap[priority] || 'gray';
    }

    // 绑定任务操作事件
    bindTaskEvents() {
        // 完成/取消完成任务
        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.currentTarget.getAttribute('data-id'));
                const isCompleted = e.currentTarget.getAttribute('data-completed') === 'true';
                this.toggleTaskCompletion(taskId, !isCompleted);
            });
        });

        // 开始/暂停任务
        document.querySelectorAll('.start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.currentTarget.getAttribute('data-id'));
                const isStarted = e.currentTarget.getAttribute('data-started') === 'true';
                const isCompleted = e.currentTarget.getAttribute('data-completed') === 'true';
                if (!isCompleted) {
                    this.toggleTaskStart(taskId, !isStarted);
                }
            });
        });

        // 编辑任务
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.openEditModal(taskId);
            });
        });

        // 删除任务
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.currentTarget.getAttribute('data-id'));
                this.deleteTask(taskId);
            });
        });
    }

    // 切换任务完成状态
    toggleTaskCompletion(taskId, completed) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            if (completed && !task.actualEnd) {
                task.actualEnd = new Date().toISOString();
            } else if (!completed) {
                task.actualEnd = '';
            }
            this.saveTasks();
            this.loadTasks();
        }
    }

    // 切换任务开始状态
    toggleTaskStart(taskId, started) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (started && !task.actualStart) {
                task.actualStart = new Date().toISOString();
            } else if (!started && task.actualStart && !task.completed) {
                task.actualStart = '';
            }
            this.saveTasks();
            this.loadTasks();
        }
    }

    // 打开编辑模态框
    openEditModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskDescription').value = task.description || '';
            document.getElementById('editTaskPriority').value = task.priority;
            document.getElementById('editTaskCategory').value = task.category;
            document.getElementById('editPlannedStart').value = task.plannedStart || '';
            document.getElementById('editPlannedEnd').value = task.plannedEnd || '';
            document.getElementById('editActualStart').value = task.actualStart || '';
            document.getElementById('editActualEnd').value = task.actualEnd || '';
            document.getElementById('editCustomTags').value = task.customTags.join(', ') || '';
            
            document.getElementById('editModal').classList.remove('hidden');
        }
    }

    // 关闭编辑模态框
    closeEditModal() {
        document.getElementById('editModal').classList.add('hidden');
        document.getElementById('editForm').reset();
    }

    // 更新任务
    updateTask() {
        const taskId = parseInt(document.getElementById('editTaskId').value);
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
            const task = this.tasks[taskIndex];
            task.title = document.getElementById('editTaskTitle').value;
            task.description = document.getElementById('editTaskDescription').value;
            task.priority = document.getElementById('editTaskPriority').value;
            task.category = document.getElementById('editTaskCategory').value;
            task.plannedStart = document.getElementById('editPlannedStart').value;
            task.plannedEnd = document.getElementById('editPlannedEnd').value;
            task.actualStart = document.getElementById('editActualStart').value;
            task.actualEnd = document.getElementById('editActualEnd').value;
            task.customTags = document.getElementById('editCustomTags').value.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag !== '');
            
            this.saveTasks();
            this.loadTasks();
            this.closeEditModal();
        }
    }

    // 删除任务
    deleteTask(taskId) {
        if (confirm('确定要删除这个任务吗？')) {
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                this.tasks.splice(taskIndex, 1);
                this.saveTasks();
                this.loadTasks();
            }
        }
    }

    // 清除已完成任务
    clearCompletedTasks() {
        if (confirm('确定要清除所有已完成的任务吗？')) {
            const completedCount = this.tasks.filter(t => t.completed).length;
            this.tasks = this.tasks.filter(t => !t.completed);
            this.saveTasks();
            this.loadTasks();
        }
    }

    // 检查过期任务
    checkOverdueTasks() {
        const now = new Date();
        this.tasks.forEach(task => {
            if (task.plannedEnd && !task.completed && this.isOverdue(task)) {
                // 这里可以添加过期通知逻辑
            }
        });
    }

    // 检查任务是否过期
    isOverdue(task) {
        if (!task.plannedEnd || task.completed) return false;
        return new Date(task.plannedEnd) < new Date();
    }

    // 更新统计数据
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const inProgress = this.tasks.filter(t => t.actualStart && !t.completed).length;
        const pending = total - completed - inProgress;
        const overdue = this.tasks.filter(t => this.isOverdue(t) && !t.completed).length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('overdueTasks').textContent = overdue;
    }

    // 更新分类统计图表
    updateCategoryChart() {
        const categories = { work: 0, personal: 0, study: 0, health: 0, other: 0 };
        
        this.tasks.forEach(task => {
            if (categories[task.category] !== undefined) {
                categories[task.category]++;
            }
        });

        if (this.timeChart) {
            this.timeChart.data.datasets.data = Object.values(categories);
            this.timeChart.update();
        }
    }

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(/\//g, '-');
    }

    // 保存任务到localStorage
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        // 重新调度提醒
        // this.scheduleReminders();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});
