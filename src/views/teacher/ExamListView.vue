<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(true)
const searchText = ref('')
const statusFilter = ref('all')

const examList = ref([])

onMounted(() => {
  // 模拟获取考试列表
  setTimeout(() => {
    examList.value = [
      {
        id: 1,
        title: '2023年第一学期数学期末考试',
        classNames: ['高一(1)班', '高一(2)班'],
        startTime: '2023-12-20 14:00',
        endTime: '2023-12-20 16:00',
        duration: 120,
        totalStudents: 93,
        submittedCount: 0,
        status: 'upcoming',
        createTime: '2023-11-15'
      },
      {
        id: 2,
        title: '2023年第一学期英语测验',
        classNames: ['高一(1)班'],
        startTime: '2023-12-15 09:00',
        endTime: '2023-12-15 10:30',
        duration: 90,
        totalStudents: 45,
        submittedCount: 0,
        status: 'upcoming',
        createTime: '2023-11-10'
      },
      {
        id: 3,
        title: '2023年第一学期物理期中考试',
        classNames: ['高一(1)班', '高一(2)班'],
        startTime: '2023-11-10 14:00',
        endTime: '2023-11-10 16:00',
        duration: 120,
        totalStudents: 93,
        submittedCount: 93,
        status: 'completed',
        createTime: '2023-10-25'
      }
    ]
    loading.value = false
  }, 1000)
})

const statusFilters = [
  { value: 'all', label: '全部状态' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'ongoing', label: '进行中' },
  { value: 'completed', label: '已结束' }
]

const getStatusType = (status) => {
  if (status === 'upcoming') return 'primary'
  if (status === 'ongoing') return 'success'
  return 'info'
}

const getStatusText = (status) => {
  if (status === 'upcoming') return '即将开始'
  if (status === 'ongoing') return '进行中'
  return '已结束'
}

const filteredExams = computed(() => {
  let result = examList.value
  
  // 按状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(exam => exam.status === statusFilter.value)
  }
  
  // 按关键词搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(exam => {
      return exam.title.toLowerCase().includes(keyword)
    })
  }
  
  return result
})

const handleCreateExam = () => {
  router.push('/teacher/create-exam')
}

const handleViewResult = (examId) => {
  // 实际应用中应该跳转到成绩查看页面
  console.log('查看考试结果', examId)
}

const handleEditExam = (examId) => {
  // 实际应用中应该跳转到编辑页面
  console.log('编辑考试', examId)
}

const handleDeleteExam = (exam) => {
  ElMessageBox.confirm(
    `确定要删除考试 "${exam.title}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 模拟删除
    const index = examList.value.findIndex(item => item.id === exam.id)
    if (index !== -1) {
      examList.value.splice(index, 1)
      ElMessage({
        type: 'success',
        message: '删除成功'
      })
    }
  }).catch(() => {
    // 取消删除
  })
}
</script>

<template>
  <div class="exam-list-container">
    <div class="page-header">
      <h2>考试管理</h2>
      <el-button type="primary" @click="handleCreateExam">创建考试</el-button>
    </div>
    
    <el-card class="exam-list-card">
      <div class="toolbar">
        <div class="filter-section">
          <el-select v-model="statusFilter" placeholder="考试状态" style="width: 120px; margin-right: 10px;">
            <el-option
              v-for="item in statusFilters"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
          <el-input
            v-model="searchText"
            placeholder="搜索考试名称"
            clearable
            style="width: 300px"
          ></el-input>
        </div>
        <div class="stats-section">
          总计 {{ filteredExams.length }} 场考试
        </div>
      </div>
      
      <el-table :data="filteredExams" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="title" label="考试名称" min-width="230"></el-table-column>
        <el-table-column label="班级" min-width="180">
          <template #default="scope">
            <el-tag v-for="(className, index) in scope.row.classNames" :key="index" size="small" style="margin-right: 5px;">
              {{ className }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="150"></el-table-column>
        <el-table-column prop="duration" label="时长" width="80">
          <template #default="scope">
            {{ scope.row.duration }}分钟
          </template>
        </el-table-column>
        <el-table-column label="提交情况" width="110">
          <template #default="scope">
            {{ scope.row.submittedCount }}/{{ scope.row.totalStudents }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button 
              v-if="scope.row.status === 'completed'"
              type="primary" 
              size="small" 
              @click="handleViewResult(scope.row.id)"
            >
              查看成绩
            </el-button>
            <el-button
              v-if="scope.row.status === 'upcoming'"
              type="warning"
              size="small"
              @click="handleEditExam(scope.row.id)"
            >
              编辑
            </el-button>
            <el-button
              v-if="scope.row.status === 'upcoming'"
              type="danger"
              size="small"
              @click="handleDeleteExam(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.exam-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.exam-list-card {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section {
  display: flex;
  align-items: center;
}

.stats-section {
  color: #666;
}
</style> 