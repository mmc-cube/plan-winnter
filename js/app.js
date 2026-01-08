// 寒假任务管理器 - 重新设计版本

class WinterVacationPlanner {
    constructor() {
        this.currentDate = new Date();
        this.tasks = this.loadTasks();
        this.currentTimer = null;
        this.timerInterval = null;
        this.selectedTask = null;
        this.vacationEndDate = new Date('2026-02-27'); // 更新为2月27日

        // 固定时间段定义
        this.timePeriods = {
            'morning1': { label: '8:00 - 10:00', name: '上午第一段' },
            'morning2': { label: '10:00 - 12:00', name: '上午第二段' },
            'afternoon1': { label: '14:00 - 16:00', name: '下午第一段' },
            'afternoon2': { label: '16:00 - 18:00', name: '下午第二段' },
            'evening': { label: '19:00 - 21:00', name: '晚上时段' }
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCurrentDate();
        this.updateCountdown();
        this.updateStats();
        this.loadDayTasks();
        this.setupCustomSelect();
        this.setupDragAndDrop();

        // 每秒更新倒计时和计时器
        setInterval(() => {
            this.updateCountdown();
            this.updateMainTimer();
        }, 1000);

        // 每分钟更新统计
        setInterval(() => this.updateStats(), 60000);
    }

    setupEventListeners() {
        // 日期导航
        document.getElementById('prevDay').addEventListener('click', () => this.changeDate(-1));
        document.getElementById('nextDay').addEventListener('click', () => this.changeDate(1));

        // 自定义任务添加
        document.getElementById('addCustomTask').addEventListener('click', () => this.addCustomTask());
        document.getElementById('customTaskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomTask();
        });

        // 主计时器控制
        document.getElementById('startMainTimer').addEventListener('click', () => this.startMainTimer());
        document.getElementById('pauseMainTimer').addEventListener('click', () => this.pauseMainTimer());
        document.getElementById('stopMainTimer').addEventListener('click', () => this.stopMainTimer());

        // 今日统计切换
        document.getElementById('toggleDailyStats').addEventListener('click', () => this.toggleDailyStats());

        // 时间段点击事件
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('click', () => this.handleTimeSlotClick(slot));
        });
    }

    setupCustomSelect() {
        const selectDisplay = document.getElementById('selectDisplay');
        const selectOptions = document.getElementById('selectOptions');

        selectDisplay.addEventListener('click', () => {
            selectDisplay.classList.toggle('active');
            selectOptions.classList.toggle('show');
        });

        // 选项点击事件
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', (e) => {
                const taskName = option.dataset.task;
                const taskEmoji = option.dataset.emoji;

                this.selectedTask = { name: taskName, emoji: taskEmoji };

                // 更新显示
                document.querySelector('.selected-task').innerHTML = `${taskEmoji} ${taskName}`;

                // 关闭下拉菜单
                selectDisplay.classList.remove('active');
                selectOptions.classList.remove('show');

                // 重置当前任务时间显示
                document.getElementById('currentTaskTime').textContent = '0分钟';
            });
        });

        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-select')) {
                selectDisplay.classList.remove('active');
                selectOptions.classList.remove('show');
            }
        });
    }

    setupDragAndDrop() {
        // 任务项拖拽
        document.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.task);
                item.style.opacity = '0.5';
            });

            item.addEventListener('dragend', (e) => {
                item.style.opacity = '1';
            });
        });

        // 时间段拖拽目标
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const taskName = e.dataTransfer.getData('text/plain');
                this.assignTaskToSlot(slot, taskName);
            });
        });
    }

    assignTaskToSlot(timeSlot, taskName) {
        const period = timeSlot.dataset.period;
        const dateKey = this.getDateKey(this.currentDate);

        if (!this.tasks[dateKey]) {
            this.tasks[dateKey] = {};
        }

        // 获取任务emoji
        const taskEmoji = this.getTaskEmoji(taskName);

        this.tasks[dateKey][period] = {
            name: taskName,
            emoji: taskEmoji,
            totalTime: 0
        };

        this.updateTimeSlotDisplay(timeSlot, taskName, taskEmoji);
        this.saveTasks();
        this.updateStats();
    }

    updateTimeSlotDisplay(timeSlot, taskName, emoji) {
        const period = timeSlot.dataset.period;
        const dateKey = this.getDateKey(this.currentDate);
        const task = this.tasks[dateKey]?.[period];

        timeSlot.classList.add('has-task');

        const totalMinutes = task ? task.totalTime : 0;
        const timeDisplay = this.formatTime(totalMinutes);

        timeSlot.querySelector('.task-content').innerHTML = `
            <div class="task-display">
                <span class="task-emoji">${emoji}</span>
                <span class="task-name">${taskName}</span>
            </div>
            <div class="task-time">${timeDisplay}</div>
        `;
    }

    handleTimeSlotClick(timeSlot) {
        const period = timeSlot.dataset.period;
        const dateKey = this.getDateKey(this.currentDate);
        const task = this.tasks[dateKey]?.[period];

        if (!task) {
            alert('请先为此时间段分配任务！');
            return;
        }

        // 设置选中的任务为当前时间段的任务
        this.selectedTask = { name: task.name, emoji: task.emoji };
        document.querySelector('.selected-task').innerHTML = `${task.emoji} ${task.name}`;

        // 更新当前任务时间显示
        document.getElementById('currentTaskTime').textContent = this.formatTime(task.totalTime);
    }

    startMainTimer() {
        if (!this.selectedTask) {
            alert('请先选择一个任务！');
            return;
        }

        this.currentTimer = {
            task: this.selectedTask,
            startTime: Date.now(),
            isActive: true
        };

        document.getElementById('startMainTimer').style.display = 'none';
        document.getElementById('pauseMainTimer').style.display = 'inline-flex';

        this.timerInterval = setInterval(() => {
            this.updateMainTimer();
        }, 1000);

        this.saveTasks();
    }

    pauseMainTimer() {
        if (!this.currentTimer || !this.timerInterval) return;

        const sessionTime = Math.floor((Date.now() - this.currentTimer.startTime) / 1000 / 60);

        // 更新任务总时间
        this.updateTaskTime(this.currentTimer.task.name, sessionTime);

        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.currentTimer = null;

        document.getElementById('startMainTimer').style.display = 'inline-flex';
        document.getElementById('pauseMainTimer').style.display = 'none';

        this.updateStats();
        this.loadDayTasks();
        this.saveTasks();
    }

    stopMainTimer() {
        this.pauseMainTimer();

        // 重置计时器显示
        document.getElementById('timerDisplayLarge').textContent = '00:00:00';

        // 重置选择的任务
        this.selectedTask = null;
        document.querySelector('.selected-task').textContent = '请选择任务';
        document.getElementById('currentTaskTime').textContent = '0分钟';
    }

    updateMainTimer() {
        if (!this.currentTimer || !this.currentTimer.isActive) return;

        const currentSeconds = Math.floor((Date.now() - this.currentTimer.startTime) / 1000);
        const hours = Math.floor(currentSeconds / 3600);
        const minutes = Math.floor((currentSeconds % 3600) / 60);
        const seconds = currentSeconds % 60;

        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplayLarge').textContent = timeString;

        // 更新当前任务时间显示
        const totalMinutes = this.getCurrentTaskTotalTime() + Math.floor(currentSeconds / 60);
        document.getElementById('currentTaskTime').textContent = this.formatTime(totalMinutes);
    }

    getCurrentTaskTotalTime() {
        if (!this.selectedTask) return 0;

        const dateKey = this.getDateKey(this.currentDate);
        const dayTasks = this.tasks[dateKey] || {};

        let totalTime = 0;
        Object.values(dayTasks).forEach(task => {
            if (task.name === this.selectedTask.name) {
                totalTime += task.totalTime;
            }
        });

        return totalTime;
    }

    updateTaskTime(taskName, additionalMinutes) {
        const dateKey = this.getDateKey(this.currentDate);
        const dayTasks = this.tasks[dateKey] || {};

        // 更新所有匹配的任务时间
        Object.keys(dayTasks).forEach(period => {
            if (dayTasks[period].name === taskName) {
                dayTasks[period].totalTime += additionalMinutes;
            }
        });
    }

    toggleDailyStats() {
        const button = document.getElementById('toggleDailyStats');
        const details = document.getElementById('dailyStatsDetails');

        button.classList.toggle('active');

        if (details.style.display === 'none') {
            details.style.display = 'block';
        } else {
            details.style.display = 'none';
        }
    }

    addCustomTask() {
        const input = document.getElementById('customTaskInput');
        const taskName = input.value.trim();

        if (!taskName) return;

        // 创建新的任务项
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.draggable = true;
        taskItem.dataset.task = taskName;

        taskItem.innerHTML = `
            <span class="task-emoji">📝</span>
            <span class="task-name">${taskName}</span>
        `;

        // 添加拖拽事件
        taskItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', taskName);
            taskItem.style.opacity = '0.5';
        });

        taskItem.addEventListener('dragend', (e) => {
            taskItem.style.opacity = '1';
        });

        // 添加到任务列表
        document.querySelector('.task-items').appendChild(taskItem);

        // 添加到下拉选择器
        const option = document.createElement('div');
        option.className = 'option';
        option.dataset.task = taskName;
        option.dataset.emoji = '📝';
        option.innerHTML = `📝 ${taskName}`;

        option.addEventListener('click', () => {
            this.selectedTask = { name: taskName, emoji: '📝' };
            document.querySelector('.selected-task').innerHTML = `📝 ${taskName}`;
            document.getElementById('selectDisplay').classList.remove('active');
            document.getElementById('selectOptions').classList.remove('show');
            document.getElementById('currentTaskTime').textContent = '0分钟';
        });

        document.getElementById('selectOptions').appendChild(option);

        // 清空输入框
        input.value = '';
    }

    changeDate(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this.updateCurrentDate();
        this.loadDayTasks();
        this.updateStats();
    }

    updateCurrentDate() {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };
        document.getElementById('currentDate').textContent =
            this.currentDate.toLocaleDateString('zh-CN', options);
    }

    updateCountdown() {
        const now = new Date();
        const timeDiff = this.vacationEndDate - now;

        if (timeDiff > 0) {
            const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            document.getElementById('days').textContent = days;
        } else {
            document.getElementById('days').textContent = '0';
        }
    }

    loadDayTasks() {
        const dateKey = this.getDateKey(this.currentDate);
        const dayTasks = this.tasks[dateKey] || {};

        // 清除所有时间段的任务显示
        document.querySelectorAll('.time-slot').forEach(slot => {
            const period = slot.dataset.period;
            slot.classList.remove('has-task');

            if (dayTasks[period]) {
                const task = dayTasks[period];
                this.updateTimeSlotDisplay(slot, task.name, task.emoji);
            } else {
                slot.querySelector('.task-content').innerHTML =
                    '<div class="task-placeholder">点击或拖拽任务到这里</div>';
            }
        });
    }

    updateStats() {
        const dateKey = this.getDateKey(this.currentDate);
        const dayTasks = this.tasks[dateKey] || {};

        let totalMinutes = 0;
        let completedPeriods = 0;

        Object.values(dayTasks).forEach(task => {
            totalMinutes += task.totalTime;
            if (task.totalTime > 0) completedPeriods++;
        });

        // 更新统计显示
        document.getElementById('totalTime').textContent = this.formatTime(totalMinutes);
        document.getElementById('completedPeriods').textContent = `${completedPeriods}/5`;

        // 计算效率指数
        const totalPeriods = Object.keys(this.timePeriods).length;
        const efficiency = totalPeriods > 0 ? Math.round((completedPeriods / totalPeriods) * 100) : 0;
        document.getElementById('efficiency').textContent = `${efficiency}%`;
    }

    getTaskEmoji(taskName) {
        const emojiMap = {
            '学习': '📖',
            '运动': '🏃‍♂️',
            '阅读': '📚',
            '编程': '💻',
            '休息': '😴',
            '娱乐': '🎮'
        };
        return emojiMap[taskName] || '📝';
    }

    formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes}分钟`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
        }
    }

    getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    loadTasks() {
        const saved = localStorage.getItem('winterVacationTasks');
        return saved ? JSON.parse(saved) : {};
    }

    saveTasks() {
        localStorage.setItem('winterVacationTasks', JSON.stringify(this.tasks));
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new WinterVacationPlanner();
});

// 保留工具函数
window.WinterVacationUtils = {
    exportData() {
        const data = localStorage.getItem('winterVacationTasks');
        if (data) {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `winter-vacation-tasks-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    },

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                localStorage.setItem('winterVacationTasks', JSON.stringify(data));
                location.reload();
            } catch (error) {
                alert('导入失败：文件格式不正确');
            }
        };
        reader.readAsText(file);
    },

    clearAllData() {
        if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
            localStorage.removeItem('winterVacationTasks');
            location.reload();
        }
    }
};