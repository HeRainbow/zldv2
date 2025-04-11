<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const classList = ref([])
const loading = ref(true)
const searchText = ref('')

onMounted(() => {
  // 模拟获取班级列表数据
  setTimeout(() => {
    classList.value = [
      {
        id: 1,
        name: '高一(1)班',
        year: '2023',
        count: 45,
        createTime: '2023-09-01'
      },
      {
        id: 2,
        name: '高一(2)班',
        year: '2023',
        count: 48,
        createTime: '2023-09-01'
      },
      {
        id: 3,
        name: '高二(1)班',
        year: '2022',
        count: 46,
        createTime: '2022-09-01'
      }
    ]
    loading.value = false
  }, 1000)
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
</script>

<template>
  <div class="class-list-container">
    <div class="page-header">
      <h2>班级管理</h2>
      <el-button type="primary" @click="handleCreateClass">创建班级</el-button>
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
        <el-table-column prop="year" label="年份" width="120"></el-table-column>
        <el-table-column prop="count" label="学生数量" width="120"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
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
</style> 