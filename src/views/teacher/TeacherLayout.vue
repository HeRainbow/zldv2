<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const activeIndex = ref('/teacher/class-list')

// 监听路由变化，更新activeIndex
watch(() => route.path, (newPath) => {
  activeIndex.value = newPath
}, { immediate: true })

// 初始化时设置activeIndex为当前路由路径
onMounted(() => {
  activeIndex.value = route.path
})

const handleSelect = (key) => {
  router.push(key)
}

// 处理退出登录
const handleLogout = async () => {
  try {
    // 调用退出登录接口
    const res = await request({
      url: '/user/logout',
      method: 'post'
    })
    
    if (res.code === 0) {
      // 清除本地用户信息和token
      localStorage.removeItem('userInfo')
      localStorage.removeItem('token')
      ElMessage.success('退出登录成功')
      // 跳转到登录页
      router.push('/login')
    } else {
      ElMessage.error(res.message || '退出失败')
    }
  } catch (error) {
    console.error('退出登录出错', error)
    ElMessage.error('退出失败，请稍后重试')
    // 即使接口调用失败，也清除本地信息并跳转到登录页
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
    router.push('/login')
  }
}
</script>

<template>
  <el-container class="layout-container">
    <el-header>
      <div class="header-container">
        <h2 class="system-title">答题系统 - 教师端</h2>
        <el-dropdown @command="handleLogout">
          <span class="user-info">
            教师用户
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    
    <el-container>
      <el-aside width="200px">
        <el-menu
          :default-active="activeIndex"
          class="side-menu"
          @select="handleSelect"
          router
        >
          <el-sub-menu index="/teacher/class">
            <template #title>
              <el-icon><user-filled /></el-icon>
              <span>班级管理</span>
            </template>
            <el-menu-item index="/teacher/class-list">班级列表</el-menu-item>
            <el-menu-item index="/teacher/create-class">创建班级</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="/teacher/exam">
            <template #title>
              <el-icon><document /></el-icon>
              <span>考试管理</span>
            </template>
            <el-menu-item index="/teacher/exam-list">考试列表</el-menu-item>
            <el-menu-item index="/teacher/create-exam">创建考试</el-menu-item>
          </el-sub-menu>
          
          <el-sub-menu index="/teacher/question">
            <template #title>
              <el-icon><edit /></el-icon>
              <span>题目管理</span>
            </template>
            <el-menu-item index="/teacher/question-bank">单选题管理</el-menu-item>
            <el-menu-item index="/teacher/blank-questions">填空题管理</el-menu-item>
            <el-menu-item index="/teacher/create-question">创建题目</el-menu-item>
          </el-sub-menu>
          
          <el-menu-item index="/teacher/students-management">
            <el-icon><user /></el-icon>
            <span>学生管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  width: 100%;
  height: 100vh;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.system-title {
  margin: 0;
  color: #409EFF;
}

.el-header {
  background-color: white;
  color: #303133;
  line-height: 60px;
  border-bottom: 1px solid #EBEEF5;
}

.el-aside {
  background-color: #fff;
  color: #333;
  border-right: 1px solid #EBEEF5;
}

.side-menu {
  height: 100%;
  border-right: none;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
}
</style> 