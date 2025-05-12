<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const activeIndex = ref('/student/exam-list')

const handleSelect = (key) => {
  activeIndex.value = key
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
        <h2 class="system-title">答题系统 - 学生端</h2>
        <el-dropdown @command="handleLogout">
          <span class="user-info">
            学生用户
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
          <el-menu-item index="/student/exam-list">
            <el-icon><menu /></el-icon>
            <span>考试列表</span>
          </el-menu-item>
          <el-menu-item index="/student/scores">
            <el-icon><document /></el-icon>
            <span>成绩查询</span>
          </el-menu-item>
          <el-menu-item index="/student/peer-review">
            <el-icon><reading /></el-icon>
            <span>试卷互评</span>
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