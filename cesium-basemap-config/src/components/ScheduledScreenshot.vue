<template>
  <div class="scheduled-screenshot">
    <h1>定期截图管理</h1>
    
    <div class="nav-bar">
      <router-link to="/" class="nav-btn">返回底图配置</router-link>
    </div>
    
    <form @submit.prevent="createTask" id="createTaskForm">
      <h2>创建新任务</h2>
      <div class="form-group">
        <label for="url">页面URL:</label>
        <input type="url" id="url" v-model="taskForm.url" required placeholder="https://example.com">
      </div>
      
      <div class="form-group">
        <label for="interval">截图间隔 (毫秒):</label>
        <input type="number" id="interval" v-model="taskForm.interval" min="1000" required>
      </div>
      
      <div class="form-group">
        <label for="width">宽度 (像素):</label>
        <input type="number" id="width" v-model="taskForm.width">
      </div>
      
      <div class="form-group">
        <label for="height">高度 (像素):</label>
        <input type="number" id="height" v-model="taskForm.height">
      </div>
      
      <div class="form-group">
        <label for="selector">CSS选择器 (可选):</label>
        <input type="text" id="selector" v-model="taskForm.selector" placeholder="#main-content">
      </div>
      
      <div class="form-group">
        <label for="maxScreenshots">最大截图数量:</label>
        <input type="number" id="maxScreenshots" v-model="taskForm.maxScreenshots" min="1">
      </div>
      
      <button type="submit">创建任务</button>
    </form>
    
    <div class="examples-section">
      <h2>使用示例配置</h2>
      <p>选择下列示例配置之一快速创建任务：</p>
      <div class="example-list">
        <div v-if="loadingExamples" class="loading">加载示例配置中...</div>
        <div v-else-if="examples.length === 0" class="loading">没有可用的示例配置</div>
        <div v-else v-for="(example, index) in examples" :key="index" class="example-item">
          <h4>{{ example.name }}</h4>
          <p>{{ example.description }}</p>
          <button @click="loadExampleConfig(example.config)">使用此配置</button>
        </div>
      </div>
    </div>
    
    <h2>任务列表</h2>
    <button @click="loadTasks">刷新任务列表</button>
    <div class="tasks-list">
      <div v-if="loadingTasks" class="loading">加载中...</div>
      <div v-else-if="tasks.length === 0" class="loading">没有进行中的任务</div>
      <div v-else v-for="task in tasks" :key="task.id" class="card">
        <h3>任务ID: {{ task.id }}</h3>
        <p><strong>URL:</strong> {{ task.url }}</p>
        <p><strong>截图间隔:</strong> {{ task.interval }}ms</p>
        <p><strong>输出目录:</strong> {{ task.outputDir }}</p>
        <p><strong>截图数量:</strong> {{ task.screenshotCount }}</p>
        <p><strong>开始时间:</strong> {{ new Date(task.startTime).toLocaleString() }}</p>
        <p><strong>运行时间:</strong> {{ formatTime(calculateRunningTime(task.startTime)) }}</p>
        <p><strong>状态:</strong> <span :class="task.isRunning ? 'status-running' : 'status-stopped'">{{ task.isRunning ? '运行中' : '已停止' }}</span></p>
        <p v-if="task.lastScreenshot"><strong>最新截图:</strong> {{ task.lastScreenshot }}</p>
        
        <div class="task-controls">
          <button v-if="task.isRunning" class="btn-stop" @click="stopTask(task.id)">停止任务</button>
          <button v-else class="btn-restart" @click="restartTask(task.id)">重启任务</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';

// 定义接口
interface ExampleConfig {
  url: string;
  interval: number;
  width?: number;
  height?: number;
  selector?: string;
  maxScreenshots?: number;
}

interface Example {
  name: string;
  config: ExampleConfig;
  description: string;
}

interface Task {
  id: string;
  url: string;
  interval: number;
  outputDir: string;
  isRunning: boolean;
  lastScreenshot: string | null;
  screenshotCount: number;
  startTime: string;
}

// 状态定义
const taskForm = reactive({
  url: '',
  interval: 5000,
  width: 1920,
  height: 1080,
  selector: '',
  maxScreenshots: 10
});

const examples = ref<Example[]>([]);
const tasks = ref<Task[]>([]);
const loadingExamples = ref(true);
const loadingTasks = ref(true);

// API 地址
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '';

// 方法
const loadExamples = async () => {
  loadingExamples.value = true;
  try {
    const response = await fetch(`${API_ENDPOINT}/data/example-config.json`);
    const data = await response.json();
    
    if (!data.examples || data.examples.length === 0) {
      examples.value = [];
      return;
    }
    
    examples.value = data.examples;
  } catch (error) {
    console.error('加载示例配置失败:', error);
    examples.value = [];
  } finally {
    loadingExamples.value = false;
  }
};

const loadExampleConfig = (config: ExampleConfig) => {
  taskForm.url = config.url || '';
  taskForm.interval = config.interval || 5000;
  taskForm.width = config.width || 1920;
  taskForm.height = config.height || 1080;
  taskForm.selector = config.selector || '';
  taskForm.maxScreenshots = config.maxScreenshots || 10;
  
  // 滚动到表单
  document.getElementById('createTaskForm')?.scrollIntoView({ behavior: 'smooth' });
};

const loadTasks = async () => {
  loadingTasks.value = true;
  try {
    const response = await fetch(`${API_ENDPOINT}/screenshot/scheduled`);
    const data = await response.json();
    
    tasks.value = data;
  } catch (error) {
    console.error('加载任务失败:', error);
    tasks.value = [];
  } finally {
    loadingTasks.value = false;
  }
};

const createTask = async () => {
  try {
    const response = await fetch(`${API_ENDPOINT}/screenshot/scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskForm)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '创建任务失败');
    }
    
    const result = await response.json();
    alert(`任务创建成功! 任务ID: ${result.id}`);
    
    // 重置表单
    taskForm.url = '';
    taskForm.interval = 5000;
    taskForm.width = 1920;
    taskForm.height = 1080;
    taskForm.selector = '';
    taskForm.maxScreenshots = 10;
    
    // 重新加载任务列表
    loadTasks();
  } catch (error: any) {
    console.error('创建任务失败:', error);
    alert(`创建任务失败: ${error.message}`);
  }
};

const stopTask = async (taskId: string) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/screenshot/scheduled/${taskId}/stop`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '停止任务失败');
    }
    
    alert(`任务 ${taskId} 已停止`);
    loadTasks();
  } catch (error: any) {
    console.error('停止任务失败:', error);
    alert(`停止任务失败: ${error.message}`);
  }
};

const restartTask = async (taskId: string) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/screenshot/scheduled/${taskId}/restart`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '重启任务失败');
    }
    
    alert(`任务 ${taskId} 已重启`);
    loadTasks();
  } catch (error: any) {
    console.error('重启任务失败:', error);
    alert(`重启任务失败: ${error.message}`);
  }
};

const calculateRunningTime = (startTime: string): number => {
  return Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours}小时 ${minutes}分钟 ${secs}秒`;
};

// 生命周期
onMounted(() => {
  loadExamples();
  loadTasks();
});
</script>

<style scoped>
.scheduled-screenshot {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  padding: 20px;
  color: #333;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #2980b9;
}

.card {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.task-controls {
  display: flex;
  gap: 10px;
}

.btn-stop {
  background-color: #e74c3c;
}

.btn-stop:hover {
  background-color: #c0392b;
}

.btn-restart {
  background-color: #2ecc71;
}

.btn-restart:hover {
  background-color: #27ae60;
}

.status-running {
  color: #2ecc71;
  font-weight: bold;
}

.status-stopped {
  color: #e74c3c;
  font-weight: bold;
}

.tasks-list {
  margin-top: 20px;
}

.loading {
  color: #3498db;
  margin-top: 20px;
  font-style: italic;
}

.examples-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f7ff;
  border-radius: 5px;
  border: 1px solid #d0e3ff;
}

.example-list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
}

.example-item {
  background: white;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #ddd;
  width: calc(33.33% - 10px);
  box-sizing: border-box;
}

.example-item h4 {
  margin-top: 0;
  color: #3498db;
}

.example-item p {
  font-size: 14px;
  color: #666;
}

.example-item button {
  margin-top: 10px;
  background-color: #f39c12;
}

.example-item button:hover {
  background-color: #d35400;
}

.nav-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.nav-btn {
  background-color: #7f8c8d;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 16px;
  display: inline-block;
}

.nav-btn:hover {
  background-color: #6c7a89;
}
</style> 