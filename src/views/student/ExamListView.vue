<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const examList = ref([])
const loading = ref(true)
// 分页相关参数
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// 从后端获取考试列表数据
const fetchExamList = async () => {
  loading.value = true
  try {
    // 使用封装好的request替代axios直接请求
    const response = await request.post('/exam/get/student', {
      current: pagination.value.current,
      pageSize: pagination.value.pageSize,
      sortField: "",
      sortOrder: ""
    })
    
    // request.js已经处理了response.data，所以直接使用response
    if (response.code === 0) {
      // 转换后端返回的数据格式为前端所需格式
      const { records, total } = response.data
      pagination.value.total = parseInt(total)
      
      // 将后端数据转换为前端所需的数据结构
      examList.value = records.map(item => {
        // 计算考试状态
        const now = new Date()
        const startTime = new Date(item.startTime)
        const endTime = new Date(item.endTime)
        
        let status = 'completed'
        if (now < startTime) {
          status = 'upcoming'
        } else if (now >= startTime && now <= endTime) {
          status = 'ongoing'
        }
        
        // 计算考试时长（分钟）
        const durationMs = endTime - startTime
        const durationMinutes = Math.floor(durationMs / (1000 * 60))
        
        // 格式化时间显示
        const formatDate = (date) => {
          return new Date(date).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(/\//g, '-')
        }
        
        return {
          id: item.id,
          title: item.name,
          startTime: formatDate(item.startTime),
          endTime: formatDate(item.endTime),
          duration: durationMinutes,
          status: status,
          totalPoints: item.allScore || 100 // 如果没有总分则默认为100
        }
      })
    } else {
      // 请求失败处理
      console.error('获取考试列表失败:', response.message)
    }
  } catch (error) {
    console.error('获取考试列表出错:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchExamList()
})

// 处理分页变化
const handlePageChange = (page) => {
  pagination.value.current = page
  fetchExamList()
}

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

// 处理进入考试
const handleTakeExam = async (examId) => {
  // 获取当前考试信息
  const currentExam = examList.value.find(exam => exam.id === examId)
  
  // 如果考试未开始，显示提示信息
  if (currentExam && currentExam.status === 'upcoming') {
    ElMessage.warning('考试尚未开始，请在开始时间后再进入')
    return
  }
  
  // 加载状态
  loading.value = true
  
  try {
    // 调用接口获取考试题目数据
    const response = await request.post('/exam/get/question/student', {
      id: examId
    })
    
    if (response.code === 0) {
      // 将考试数据存储到 localStorage，以便在考试页面使用
      const examData = response.data
      localStorage.setItem('currentExamData', JSON.stringify(examData))
      
      // 跳转到考试页面
      router.push(`/student/take-exam/${examId}`)
    } else {
      ElMessage.error(`获取考试题目失败: ${response.message}`)
    }
  } catch (error) {
    console.error('获取考试题目出错:', error)
    ElMessage.error('获取考试题目时发生错误，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="exam-list-container">
    <div class="page-header">
      <h2>考试列表</h2>
    </div>
    
    <el-card class="exam-list-card">
      <el-table :data="examList" v-loading="loading" style="width: 100%">
        <el-table-column prop="title" label="考试名称" min-width="250"></el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="180"></el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="180"></el-table-column>
        <el-table-column prop="duration" label="考试时长" width="100">
          <template #default="scope">
            {{ scope.row.duration }}分钟
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'ongoing'"
              type="primary"
              size="small"
              @click="handleTakeExam(scope.row.id)"
            >
              进入考试
            </el-button>
            <el-button
              v-else-if="scope.row.status === 'upcoming'"
              type="info"
              size="small"
              disabled
              @click="handleTakeExam(scope.row.id)"
            >
              未开始
            </el-button>
            <el-button
              v-else
              type="info"
              size="small"
              @click="handleTakeExam(scope.row.id)"
            >
              查看试卷
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 添加分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @current-change="handlePageChange"
          layout="total, prev, pager, next"
          background
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.exam-list-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.exam-list-card {
  width: 100%;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style> 