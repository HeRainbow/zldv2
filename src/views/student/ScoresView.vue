<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const examList = ref([]) // 考试列表
const scoreDetails = ref({}) // 考试详情成绩
const loading = ref(true)
const scoreLoading = ref(false)

// 从后端获取考试列表数据
const fetchExamList = async () => {
  loading.value = true
  try {
    // 获取考试列表
    const response = await request.post('/exam/get/student', {
      current: 1,
      pageSize: 50,
      sortField: "",
      sortOrder: ""
    })
    
    if (response.code === 0 && response.data && response.data.records) {
      console.log('考试列表数据:', response.data)
      
      // 处理考试数据
      examList.value = response.data.records.map(item => {
        return {
          id: item.id,
          name: item.name,
          startTime: formatDateTime(item.startTime),
          endTime: formatDateTime(item.endTime),
          createTime: formatDateTime(item.createTime),
          hasScore: false,
          score: null
        }
      })
      
      // 对于每个考试，获取成绩信息
      for (const exam of examList.value) {
        await fetchExamScore(exam.id)
      }
    } else {
      ElMessage.error(`获取考试列表失败: ${response.message || '未知错误'}`)
    }
  } catch (error) {
    console.error('获取考试列表出错:', error)
    ElMessage.error('获取考试列表时发生错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取指定考试的成绩
const fetchExamScore = async (examId) => {
  try {
    // 调用成绩查询接口
    const response = await request.post('/score/get/one', {
      id: examId
    })
    
    if (response.code === 0 && response.data) {
      console.log(`考试ID ${examId} 的成绩:`, response.data)
      
      // 更新考试列表中的成绩信息
      const examIndex = examList.value.findIndex(exam => exam.id === examId)
      if (examIndex !== -1) {
        examList.value[examIndex].hasScore = true
        examList.value[examIndex].score = response.data.score
        examList.value[examIndex].scoreDetail = response.data
      }
      
      // 保存成绩详情
      scoreDetails.value[examId] = response.data
    } else if (response.code !== 0) {
      // 如果未找到成绩，标记为未参加或未批改
      const examIndex = examList.value.findIndex(exam => exam.id === examId)
      if (examIndex !== -1) {
        examList.value[examIndex].hasScore = false
      }
    }
  } catch (error) {
    console.error(`获取考试ID ${examId} 的成绩出错:`, error)
  }
}

// 查看成绩详情
const viewScoreDetail = (examId) => {
  if (!scoreDetails.value[examId]) {
    // 如果没有成绩详情，尝试重新获取
    fetchExamScoreDetail(examId)
  } else {
    // 这里可以展示成绩详情对话框或者跳转到详情页面
    openScoreDetailDialog(examId)
  }
}

// 获取成绩详情对话框状态
const scoreDetailDialogVisible = ref(false)
const currentExamId = ref(null)

// 打开成绩详情对话框
const openScoreDetailDialog = (examId) => {
  currentExamId.value = examId
  // 设置当前成绩详情
  currentScoreDetail.value = scoreDetails.value[examId] || {}
  currentExamDetail.value = examList.value.find(exam => exam.id === examId) || {}
  scoreDetailDialogVisible.value = true
}

// 获取当前考试详情
const currentExamDetail = ref({})
const currentScoreDetail = ref({})

// 获取考试成绩详情
const fetchExamScoreDetail = async (examId) => {
  scoreLoading.value = true
  try {
    const response = await request.post('/score/get/one', {
      id: examId
    })
    
    if (response.code === 0 && response.data) {
      // 更新成绩详情
      scoreDetails.value[examId] = response.data
      // 显示详情对话框
      currentExamDetail.value = examList.value.find(exam => exam.id === examId) || {}
      currentScoreDetail.value = response.data
      scoreDetailDialogVisible.value = true
    } else {
      ElMessage.warning('未找到该考试的成绩信息')
    }
  } catch (error) {
    console.error('获取成绩详情出错:', error)
    ElMessage.error('获取成绩详情失败，请稍后重试')
  } finally {
    scoreLoading.value = false
  }
}

// 格式化日期时间
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  const date = new Date(dateTimeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 获取成绩样式
const getScoreStyle = (score) => {
  if (score === null || score === undefined) return ''
  
  const scoreNum = Number(score)
  if (scoreNum >= 85) return 'score-excellent'
  if (scoreNum >= 60) return 'score-pass'
  return 'score-fail'
}

// 获取成绩标签类型
const getScoreTagType = (score) => {
  if (score === null || score === undefined) return 'info'
  
  const scoreNum = Number(score)
  if (scoreNum >= 85) return 'success'
  if (scoreNum >= 60) return ''
  return 'danger'
}

// 获取成绩状态文本
const getScoreStatusText = (score) => {
  if (score === null || score === undefined) return '未批改'
  
  const scoreNum = Number(score)
  if (scoreNum >= 85) return '优秀'
  if (scoreNum >= 60) return '及格'
  return '不及格'
}

// 获取成绩级别描述
const getScoreLevel = (score) => {
  if (score === null || score === undefined) return '未评分'
  
  const scoreNum = Number(score)
  if (scoreNum >= 90) return '优秀(A)'
  if (scoreNum >= 80) return '良好(B)'
  if (scoreNum >= 70) return '中等(C)'
  if (scoreNum >= 60) return '及格(D)'
  return '不及格(F)'
}

// 格式化日期显示更友好
const formatDateTimeForDisplay = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  try {
    const date = new Date(dateTimeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
  } catch (e) {
    return dateTimeStr
  }
}

onMounted(() => {
  fetchExamList()
})
</script>

<template>
  <div class="scores-container">
    <div class="page-header">
      <h2>成绩查询</h2>
    </div>
    
    <el-card class="scores-card" v-loading="loading">
      <div class="score-header">
        <h3>我的考试成绩</h3>
        <el-button type="primary" @click="fetchExamList" :loading="loading">
          刷新数据
        </el-button>
      </div>
      
      <el-table :data="examList" style="width: 100%">
        <el-table-column prop="name" label="考试名称" min-width="250"></el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="180"></el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="180"></el-table-column>
        <el-table-column label="成绩" width="120">
          <template #default="scope">
            <template v-if="scope.row.hasScore">
              <span :class="getScoreStyle(scope.row.score)">{{ scope.row.score }}</span>
            </template>
            <el-tag v-else type="info">未参加或未批改</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <template v-if="scope.row.hasScore">
              <el-tag :type="getScoreTagType(scope.row.score)">
                {{ getScoreStatusText(scope.row.score) }}
              </el-tag>
            </template>
            <el-tag v-else type="info">未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="viewScoreDetail(scope.row.id)"
              :disabled="!scope.row.hasScore"
              :loading="scoreLoading && currentExamId === scope.row.id"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="empty-data" v-if="examList.length === 0 && !loading">
        <el-empty description="暂无考试信息"></el-empty>
      </div>
    </el-card>
    
    <!-- 成绩详情对话框 -->
    <el-dialog
      v-model="scoreDetailDialogVisible"
      title="成绩详情"
      width="50%"
    >
      <div v-loading="scoreLoading">
        <div class="score-detail-header">
          <h3>{{ currentExamDetail.name }}</h3>
          <div class="score-display">
            <span class="score-label">我的成绩:</span>
            <span :class="getScoreStyle(currentScoreDetail.score)" class="score-value">
              {{ currentScoreDetail.score !== undefined ? currentScoreDetail.score : '未评分' }}
            </span>
          </div>
        </div>
        
        <div class="score-grade">
          <!-- <el-tag :type="getScoreTagType(currentScoreDetail.score)" size="large" class="grade-tag">
            {{ getScoreLevel(currentScoreDetail.score) }}
          </el-tag> -->
        </div>
        
        <el-divider></el-divider>
        
        <div class="score-detail-content">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="学生姓名">
              {{ currentScoreDetail.userName || '未知' }}
            </el-descriptions-item>
            <el-descriptions-item label="考试时间">
              {{ currentExamDetail.startTime || '-' }} 至 {{ currentExamDetail.endTime || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="提交时间">
              {{ formatDateTimeForDisplay(currentScoreDetail.createTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="批改时间">
              {{ formatDateTimeForDisplay(currentScoreDetail.updateTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="审核状态">
              <el-tag :type="currentScoreDetail.isVerify === 1 ? 'success' : 'warning'">
                {{ currentScoreDetail.isVerify === 1 ? '已审核' : '未审核' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="score-notice" v-if="currentScoreDetail.score === undefined">
          <el-alert
            title="提示：该考试成绩尚未评分或您未参加此次考试"
            type="info"
            :closable="false"
            show-icon
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="scoreDetailDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="fetchExamList">刷新数据</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.scores-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.scores-card {
  width: 100%;
  margin-bottom: 20px;
}

.score-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.score-header h3 {
  margin: 0;
  color: #303133;
}

.empty-data {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}

/* 成绩颜色 */
.score-excellent {
  color: #67C23A;
  font-weight: bold;
}

.score-pass {
  color: #409EFF;
}

.score-fail {
  color: #F56C6C;
  font-weight: bold;
}

/* 成绩详情样式 */
.score-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.score-detail-header h3 {
  margin: 0;
  color: #303133;
}

.score-display {
  display: flex;
  align-items: center;
}

.score-label {
  margin-right: 10px;
  font-weight: bold;
}

.score-value {
  font-size: 28px;
  font-weight: bold;
  margin-right: 10px;
}

.score-grade {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.grade-tag {
  font-size: 16px;
  padding: 10px 25px;
}

.score-notice {
  margin-top: 20px;
}

.score-detail-content {
  margin-top: 20px;
}
</style> 