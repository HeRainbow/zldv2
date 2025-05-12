<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const classList = ref([])
const loading = ref(true)
const searchText = ref('')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 获取用户信息
const getUserInfo = () => {
  const userInfoStr = localStorage.getItem('userInfo')
  if (!userInfoStr) return null
  try {
    return JSON.parse(userInfoStr)
  } catch (error) {
    console.error('解析用户信息失败', error)
    return null
  }
}

// 获取班级列表
const fetchClassList = async () => {
  loading.value = true
  const userInfo = getUserInfo()
  
  if (!userInfo || !userInfo.id) {
    ElMessage.error('获取用户信息失败，请重新登录')
    router.push('/login')
    return
  }
  
  try {
    const res = await request({
      url: '/class/listClass',
      method: 'post',
      data: {
        current: currentPage.value,
        pageSize: pageSize.value,
        sortField: "",
        sortOrder: "",
        teacherId: userInfo.id
      }
    })
    
    if (res.code === 0 && res.data) {
      classList.value = res.data.records || []
      total.value = parseInt(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '获取班级列表失败')
    }
  } catch (error) {
    console.error('获取班级列表出错', error)
    ElMessage.error('获取班级列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 页码变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchClassList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchClassList()
}

onMounted(() => {
  fetchClassList()
})

const handleCreateClass = () => {
  router.push('/teacher/create-class')
}

const handleEditClass = (id) => {
  // 实际应用中应该跳转到编辑页面
  console.log('编辑班级', id)
}

const handleDeleteClass = (id) => {
  // 实际应用中应该弹窗确认后删除
  console.log('删除班级', id)
}

const handleViewStudents = (id) => {
  // 跳转到学生管理，并传入班级ID
  router.push({
    path: '/teacher/students-management',
    query: { classId: id }
  })
}

const filteredClassList = computed(() => {
  if (!searchText.value) return classList.value
  
  return classList.value.filter(item => {
    return item.name.toLowerCase().includes(searchText.value.toLowerCase())
  })
})

// 刷新班级列表
const refreshClassList = () => {
  fetchClassList()
}
</script>

<template>
  <div class="class-list-container">
    <div class="page-header">
      <h2>班级管理</h2>
      <div>
        <el-button type="primary" @click="handleCreateClass">创建班级</el-button>
        <el-button @click="refreshClassList">刷新</el-button>
      </div>
    </div>
    
    <el-card class="class-list-card">
      <div class="toolbar">
        <el-input
          v-model="searchText"
          placeholder="搜索班级名称"
          clearable
          prefix-icon="search"
          style="width: 300px"
        ></el-input>
      </div>
      
      <el-table :data="filteredClassList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="name" label="班级名称" min-width="180"></el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="scope">
            {{ new Date(scope.row.createTime).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleViewStudents(scope.row.id)">
              查看学生
            </el-button>
            <el-button type="warning" size="small" @click="handleEditClass(scope.row.id)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDeleteClass(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.class-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.class-list-card {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 