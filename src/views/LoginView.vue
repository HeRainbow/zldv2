<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeTab = ref('student')
const loginForm = reactive({
  username: '',
  password: ''
})
const loading = ref(false)

const handleLogin = () => {
  loading.value = true
  // 模拟登录请求
  setTimeout(() => {
    loading.value = false
    // 根据选择的角色跳转到相应的页面
    if (activeTab.value === 'student') {
      router.push('/student/exam-list')
    } else {
      router.push('/teacher/class-list')
    }
  }, 1000)
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="system-title">答题系统</h1>
      
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="学生登录" name="student"></el-tab-pane>
        <el-tab-pane label="教师登录" name="teacher"></el-tab-pane>
      </el-tabs>

      <el-form :model="loginForm" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" class="login-btn">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f7fa;
}

.login-box {
  width: 400px;
  padding: 30px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.system-title {
  text-align: center;
  margin-bottom: 30px;
  color: #409EFF;
}

.login-tabs {
  margin-bottom: 20px;
}

.login-btn {
  width: 100%;
}
</style> 