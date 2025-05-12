<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const activeTab = ref('student')
const loginForm = reactive({
  userAccount: '',
  userPassword: ''
})
const registerForm = reactive({
  userAccount: '',
  userName: '',
  userPassword: '',
  checkPassword: '',
  userRole: 0 // 默认为学生角色
})
const loading = ref(false)
const showRegister = ref(false)

// 登录功能
const handleLogin = async () => {
  loading.value = true
  try {
    // 调用登录接口
    const res = await request({
      url: '/user/login',
      method: 'post',
      data: loginForm
    })
    
    if (res.code === 0) {
      // 登录成功，保存用户信息和token
      localStorage.setItem('userInfo', JSON.stringify(res.data))
      // 保存token，用于后续请求认证
      localStorage.setItem('token', res.data.token)
      ElMessage.success('登录成功')
      
      // 根据选择的角色跳转到相应的页面
      if (activeTab.value === 'student') {
        router.push('/student/exam-list')
      } else {
        router.push('/teacher/class-list')
      }
    } else {
      ElMessage.error(res.message || '登录失败')
    }
  } catch (error) {
    console.error('登录出错', error)
    ElMessage.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 注册功能
const handleRegister = async () => {
  // 验证两次密码是否一致
  if (registerForm.userPassword !== registerForm.checkPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  
  // 根据当前选中的标签页设置用户角色
  registerForm.userRole = activeTab.value === 'student' ? 0 : 1
  
  loading.value = true
  try {
    // 调用注册接口
    const res = await request({
      url: '/user/register',
      method: 'post',
      data: registerForm
    })
    
    if (res.code === 0) {
      ElMessage.success('注册成功，请登录')
      showRegister.value = false
      // 注册成功后，将注册的账号填入登录表单
      loginForm.userAccount = registerForm.userAccount
      loginForm.userPassword = ''
    } else {
      ElMessage.error(res.message || '注册失败')
    }
  } catch (error) {
    console.error('注册出错', error)
    ElMessage.error('注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 切换到注册表单
const toggleRegister = () => {
  showRegister.value = !showRegister.value
  // 清空表单
  if (showRegister.value) {
    registerForm.userAccount = ''
    registerForm.userName = ''
    registerForm.userPassword = ''
    registerForm.checkPassword = ''
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h1 class="system-title">答题系统</h1>
      
      <!-- 登录表单 -->
      <div v-if="!showRegister">
        <el-tabs v-model="activeTab" class="login-tabs">
          <el-tab-pane label="学生登录" name="student"></el-tab-pane>
          <el-tab-pane label="教师登录" name="teacher"></el-tab-pane>
        </el-tabs>

        <el-form :model="loginForm" label-position="top">
          <el-form-item label="账号">
            <el-input v-model="loginForm.userAccount" placeholder="请输入账号" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="loginForm.userPassword" type="password" placeholder="请输入密码" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleLogin" class="login-btn">
              登录
            </el-button>
          </el-form-item>
          <div class="register-link">
            还没有账号？<el-button type="text" @click="toggleRegister">立即注册</el-button>
          </div>
        </el-form>
      </div>
      
      <!-- 注册表单 -->
      <div v-else>
        <el-tabs v-model="activeTab" class="login-tabs">
          <el-tab-pane label="学生注册" name="student"></el-tab-pane>
          <el-tab-pane label="教师注册" name="teacher"></el-tab-pane>
        </el-tabs>
        
        <h2 class="register-title">用户注册 - {{ activeTab === 'student' ? '学生' : '教师' }}</h2>
        <el-form :model="registerForm" label-position="top">
          <el-form-item label="账号">
            <el-input v-model="registerForm.userAccount" placeholder="请输入账号" />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="registerForm.userName" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="registerForm.userPassword" type="password" placeholder="请输入密码" />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input v-model="registerForm.checkPassword" type="password" placeholder="请再次输入密码" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleRegister" class="login-btn">
              注册
            </el-button>
          </el-form-item>
          <div class="register-link">
            已有账号？<el-button type="text" @click="toggleRegister">返回登录</el-button>
          </div>
        </el-form>
      </div>
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
  width: 480px;
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

.register-title {
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

.register-link {
  text-align: center;
  margin-top: 15px;
}
</style> 