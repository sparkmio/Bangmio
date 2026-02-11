<template>
  <div id="app">
    <DockBar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
import DockBar from './components/DockBar.vue'

export default {
  name: 'App',
  components: {
    DockBar
  }
}
</script>

<style>
:root {
  --primary-pink: #ff6b8b;
  --secondary-pink: #ff8fa3;
  --light-pink: #ffcad4;
  --white: #ffffff;
  --glass-bg: rgba(255, 255, 255, 0.2);
  --glass-border: rgba(255, 255, 255, 0.3);
  --glass-shadow: 0 8px 32px rgba(255, 107, 139, 0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
  background: linear-gradient(135deg, var(--white) 0%, var(--light-pink) 100%);
  min-height: 100vh;
}

.main-content {
  padding-top: 80px;
  min-height: calc(100vh - 80px);
}

/* 玻璃质感按钮 */
.glass-btn {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 10px 20px;
  color: var(--primary-pink);
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--glass-shadow);
}

.glass-btn:hover {
  background: rgba(255, 107, 139, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(255, 107, 139, 0.2);
}

.glass-btn:active {
  transform: translateY(0);
}

/* 玻璃质感卡片 */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
  padding: 20px;
  transition: all 0.3s ease;
}

.glass-card:hover {
  box-shadow: 0 12px 40px rgba(255, 107, 139, 0.15);
  transform: translateY(-4px);
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 107, 139, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--primary-pink);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--secondary-pink);
}
</style>