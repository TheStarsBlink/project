<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, type Socket } from 'socket.io-client';

const urlInput = ref('https://www.bing.com');
const isConnected = ref(false);
const isStreaming = ref(false);
const statusMessage = ref('未连接');
const socket = ref<any>(null);
const streamImage = ref<HTMLImageElement | null>(null);
const errorState = ref({
  socketError: false,
  serverError: false,
  message: ''
});

// 从环境变量获取服务器 URL
const serverUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
console.log('使用服务器URL:', serverUrl);

function updateStatus(message: string) {
  statusMessage.value = message;
  console.log(`状态：${message}`);
}

function connectSocket() {
  try {
    updateStatus('连接中...');
    
    socket.value = io(serverUrl, {
      reconnectionAttempts: 3,
      timeout: 5000
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      errorState.value.socketError = false;
      errorState.value.serverError = false;
      updateStatus(`已连接到服务器 (${socket.value?.id})`);
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
      isStreaming.value = false;
      updateStatus('已断开连接');
      if (streamImage.value) {
        streamImage.value.src = '';
      }
    });

    socket.value.on('connect_error', (err: Error) => {
      isConnected.value = false;
      errorState.value.serverError = true;
      errorState.value.message = '无法连接到服务器，请确保截图服务已启动';
      updateStatus(`连接错误: ${err.message}`);
    });

    socket.value.on('stream-frame', (imageBase64: string) => {
      if (streamImage.value) {
        streamImage.value.src = `data:image/jpeg;base64,${imageBase64}`;
      }
    });

    socket.value.on('stream-started', () => {
      isStreaming.value = true;
      updateStatus('流已开始');
    });

    socket.value.on('stream-error', (errorMessage: string) => {
      isStreaming.value = false;
      updateStatus(`流错误: ${errorMessage}`);
    });

    socket.value.on('stream-stopped', () => {
      isStreaming.value = false;
      updateStatus('流已停止');
      if (streamImage.value) {
        streamImage.value.src = '';
      }
    });
  } catch (err) {
    console.error('Socket 初始化错误:', err);
    errorState.value.socketError = true;
    errorState.value.message = err instanceof Error ? err.message : String(err);
    updateStatus(`Socket 初始化错误: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function startStream() {
  if (socket.value && socket.value.connected) {
    const url = urlInput.value.trim();
    if (!url) {
      alert('请输入有效的 URL');
      return;
    }
    updateStatus('请求开始推流...');
    socket.value.emit('start-stream', { url, width: 640, height: 480 });
  } else {
    updateStatus('未连接到服务器');
  }
}

function stopStream() {
  if (socket.value && socket.value.connected) {
    updateStatus('请求停止推流...');
    socket.value.emit('stop-stream');
  }
}

function tryReconnect() {
  if (socket.value) {
    socket.value.disconnect();
  }
  errorState.value.socketError = false;
  errorState.value.serverError = false;
  errorState.value.message = '';
  connectSocket();
}

onMounted(() => {
  // 获取图像元素引用
  streamImage.value = document.getElementById('streamImage') as HTMLImageElement;
  // 连接到服务器
  connectSocket();
});

onUnmounted(() => {
  // 断开 socket 连接
  if (socket.value) {
    if (isStreaming.value) {
      stopStream();
    }
    socket.value.disconnect();
  }
});
</script>

<template>
  <div class="streaming-test-container">
    <h1>截图流测试</h1>
    <p class="description">
      此页面展示了将无头浏览器中加载的页面通过截图序列模拟视频流传输到前端的功能。
    </p>

    <div v-if="errorState.socketError || errorState.serverError" class="error-banner">
      <p>{{ errorState.message || '连接错误' }}</p>
      <button @click="tryReconnect" class="retry-button">重试连接</button>
    </div>

    <div class="controls-section">
      <div class="input-group">
        <label for="urlInput">URL:</label>
        <input
          id="urlInput"
          v-model="urlInput"
          type="text"
          placeholder="输入要加载的URL"
          :disabled="isStreaming"
        />
      </div>

      <div class="button-group">
        <button
          class="start-button"
          @click="startStream"
          :disabled="!isConnected || isStreaming"
        >
          开始推流
        </button>
        <button
          class="stop-button"
          @click="stopStream"
          :disabled="!isStreaming"
        >
          停止推流
        </button>
      </div>
    </div>

    <div class="stream-container">
      <div class="stream-wrapper">
        <img id="streamImage" alt="视频流" />
        <div v-if="!isStreaming" class="stream-placeholder">
          <span v-if="errorState.serverError">
            服务器未连接，请确保后端服务已启动
          </span>
          <span v-else-if="errorState.socketError">
            Socket.IO 加载失败，请检查网络连接
          </span>
          <span v-else-if="isConnected">
            点击"开始推流"按钮来加载页面
          </span>
          <span v-else>
            正在连接服务器...
          </span>
        </div>
      </div>
    </div>

    <div class="status-panel">
      <div class="connection-status" :class="{ connected: isConnected }">
        连接状态: {{ isConnected ? '已连接' : '未连接' }}
      </div>
      <div class="stream-status" :class="{ active: isStreaming }">
        流状态: {{ isStreaming ? '活动' : '未活动' }}
      </div>
      <div class="status-message">
        {{ statusMessage }}
      </div>
    </div>

    <div class="offline-notice" v-if="errorState.serverError">
      <h3>离线模式说明</h3>
      <p>
        如果后端服务未运行，您可以使用以下命令启动服务器：
      </p>
      <pre>cd /path/to/project/src && npm run dev</pre>
      <p>
        或者，您可以参考以下替代方案：
      </p>
      <ul>
        <li>使用静态截图功能（不需要连接到服务器）</li>
        <li>使用HTML2Canvas等客户端库进行页面截图</li>
        <li>通过WebRTC直接与浏览器窗口共享</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.streaming-test-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100%;
}

.description {
  margin-bottom: 20px;
  color: #666;
  line-height: 1.5;
}

.error-banner {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-banner p {
  margin: 0;
  color: #d32f2f;
}

.retry-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
}

.retry-button:hover {
  background-color: #d32f2f;
}

.controls-section {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  align-items: center;
}

.input-group {
  flex: 1;
  min-width: 300px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.input-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.button-group {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.start-button {
  background-color: #4CAF50;
  color: white;
}

.stop-button {
  background-color: #f44336;
  color: white;
}

.stream-container {
  width: 100%;
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.stream-wrapper {
  width: 100%;
  position: relative;
  background-color: #f5f5f5;
  min-height: 480px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

#streamImage {
  max-width: 100%;
  height: auto;
  display: block;
}

.stream-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-style: italic;
  background-color: #f5f5f5;
  text-align: center;
  padding: 20px;
}

.status-panel {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 15px;
  margin-top: 20px;
}

.connection-status,
.stream-status {
  margin-bottom: 10px;
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
  margin-right: 15px;
  background-color: #ffecb3;
}

.connection-status.connected,
.stream-status.active {
  background-color: #c8e6c9;
}

.status-message {
  margin-top: 10px;
  font-style: italic;
  color: #666;
}

.offline-notice {
  margin-top: 30px;
  padding: 20px;
  background-color: #e8f5e9;
  border-radius: 4px;
}

.offline-notice h3 {
  margin-top: 0;
  color: #2e7d32;
  margin-bottom: 15px;
}

.offline-notice pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 10px 0;
}

.offline-notice ul {
  margin-left: 20px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-group,
  .button-group {
    width: 100%;
  }
  
  .stream-wrapper {
    min-height: 300px;
  }

  .error-banner {
    flex-direction: column;
    gap: 10px;
  }

  .retry-button {
    width: 100%;
  }
}
</style> 