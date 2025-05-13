<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const examId = route.params.id

// 页面状态
const loading = ref(false)
const examData = ref({})
const studentScores = ref([])
const totalStudents = ref(0)
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 搜索和筛选
const searchText = ref('')
const scoreFilter = ref('all')

// 统计信息
const statistics = reactive({
  avgScore: 0,
  maxScore: 0,
  minScore: 0,
  passCount: 0,
  passRate: '0%',
  excellentCount: 0,
  excellentRate: '0%',
  // 添加分数段统计
  scoreDistribution: {
    '<60': 0,
    '60-70': 0,
    '70-80': 0,
    '80-90': 0,
    '90-100': 0
  }
})

// 用户信息映射，用于存储用户ID与姓名的对应关系
const userMap = ref({})

// 获取考试详情
const fetchExamDetail = async () => {
  if (!examId) {
    ElMessage.error('考试ID不能为空')
    router.push('/teacher/exam-list')
    return
  }
  
  loading.value = true
  try {
    const res = await request({
      url: '/exam/get/teacher',
      method: 'post',
      data: {
        id: examId,
        current: 1,
        pageSize: 1
      }
    })
    
    if (res.code === 0 && res.data && res.data.records && res.data.records.length > 0) {
      const exam = res.data.records[0]
      
      // 格式化时间
      const formatTime = (timeStr) => {
        const date = new Date(timeStr)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }
      
      // 处理考试数据
      examData.value = {
        id: exam.id,
        name: exam.name,
        classId: exam.classId,
        startTime: formatTime(exam.startTime),
        endTime: formatTime(exam.endTime),
        createTime: formatTime(exam.createTime),
      }
      
      // 获取学生成绩
      await fetchStudentScores()
    } else {
      ElMessage.error('获取考试详情失败')
      router.push('/teacher/exam-list')
    }
  } catch (error) {
    console.error('获取考试详情失败', error)
    ElMessage.error('获取考试详情失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取学生成绩
const fetchStudentScores = async () => {
  loading.value = true
  try {
    const res = await request.post('/score/get/class', {
      id: examId
    })
    
    if (res.code === 0 && res.data) {
      // 获取学生成绩数据
      studentScores.value = res.data
      totalStudents.value = res.data.length
      pagination.total = res.data.length
      
      // 获取学生用户信息（如果需要）
      await fetchUserInfo()
      
      // 计算统计信息
      calculateStatistics()
    } else {
      ElMessage.error('获取学生成绩失败')
    }
  } catch (error) {
    console.error('获取学生成绩失败', error)
    ElMessage.error('获取学生成绩失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    // 提取所有用户ID
    const userIds = studentScores.value.map(score => score.userId)
    
    // 调用获取用户信息的接口
    // 注意：这里假设有一个批量获取用户信息的接口
    // 如果没有这样的接口，可以循环单独获取或者临时使用用户ID
    
    // 模拟获取用户信息 - 在实际项目中替换为实际API调用
    for (const score of studentScores.value) {
      userMap.value[score.userId] = `学生${score.userId}`
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
  }
}

// 计算统计信息
const calculateStatistics = () => {
  if (studentScores.value.length === 0) {
    return
  }
  
  // 计算平均分、最高分、最低分
  let sum = 0
  let max = 0
  let min = Infinity
  let passCount = 0
  let excellentCount = 0
  const passScore = 60 // 及格分数
  const excellentScore = 85 // 优秀分数
  
  // 重置分数段统计
  statistics.scoreDistribution = {
    '<60': 0,
    '60-70': 0,
    '70-80': 0,
    '80-90': 0,
    '90-100': 0
  }
  
  studentScores.value.forEach(score => {
    const scoreNum = Number(score.score)
    sum += scoreNum
    max = Math.max(max, scoreNum)
    min = Math.min(min, scoreNum)
    
    if (scoreNum >= passScore) {
      passCount++
    }
    
    if (scoreNum >= excellentScore) {
      excellentCount++
    }
    
    // 统计分数段
    if (scoreNum < 60) {
      statistics.scoreDistribution['<60']++
    } else if (scoreNum < 70) {
      statistics.scoreDistribution['60-70']++
    } else if (scoreNum < 80) {
      statistics.scoreDistribution['70-80']++
    } else if (scoreNum < 90) {
      statistics.scoreDistribution['80-90']++
    } else {
      statistics.scoreDistribution['90-100']++
    }
  })
  
  statistics.avgScore = (sum / studentScores.value.length).toFixed(2)
  statistics.maxScore = max
  statistics.minScore = min
  statistics.passCount = passCount
  statistics.passRate = ((passCount / studentScores.value.length) * 100).toFixed(2) + '%'
  statistics.excellentCount = excellentCount
  statistics.excellentRate = ((excellentCount / studentScores.value.length) * 100).toFixed(2) + '%'
}

// 筛选后的数据
const filteredStudentScores = computed(() => {
  let result = studentScores.value
  
  // 按成绩范围筛选
  if (scoreFilter.value !== 'all') {
    result = result.filter(score => {
      const scoreNum = Number(score.score)
      switch (scoreFilter.value) {
        case 'fail':
          return scoreNum < 60
        case 'pass':
          return scoreNum >= 60 && scoreNum < 85
        case 'excellent':
          return scoreNum >= 85
        default:
          return true
      }
    })
  }
  
  // 按关键词搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(score => {
      const userName = userMap.value[score.userId] || `学生${score.userId}`
      return (
        score.userId.toString().includes(keyword) ||
        userName.toLowerCase().includes(keyword) ||
        score.score.toString().includes(keyword)
      )
    })
  }
  
  return result
})

// 处理分页变化
const handlePageChange = (page) => {
  pagination.current = page
}

// 获取成绩状态
const getScoreStatus = (score) => {
  const scoreNum = Number(score)
  if (scoreNum >= 85) return 'excellent'
  if (scoreNum >= 60) return 'pass'
  return 'fail'
}

// 导出成绩Excel
const exportToExcel = () => {
  ElMessage.info('导出功能已触发，实际项目中可对接后端导出接口')
  // 实际项目中可以调用后端接口生成Excel文件并下载
}

// 初始化
onMounted(() => {
  fetchExamDetail()
})
</script>

<template>
  <div class="exam-result-container">
    <div class="page-header">
      <h2>考试成绩查询</h2>
      <div class="header-actions">
        <!-- <el-button type="success" @click="exportToExcel">导出成绩</el-button> -->
        <el-button type="primary" @click="router.push('/teacher/exam-list')">返回考试列表</el-button>
      </div>
    </div>
    
    <el-card v-loading="loading" class="exam-info-card">
      <template #header>
        <div class="exam-title">
          <h3>{{ examData.name }}</h3>
          <el-tag>学生人数: {{ totalStudents }}</el-tag>
        </div>
      </template>
      
      <div class="exam-info">
        <div class="info-item">
          <span class="label">开始时间:</span>
          <span>{{ examData.startTime }}</span>
        </div>
        <div class="info-item">
          <span class="label">结束时间:</span>
          <span>{{ examData.endTime }}</span>
        </div>
      </div>
      
      <!-- 成绩统计信息 -->
      <div class="statistics-container">
        <el-divider content-position="left">成绩统计</el-divider>
        <div class="statistics-grid">
          <div class="stat-item">
            <div class="stat-value">{{ statistics.avgScore }}</div>
            <div class="stat-label">平均分</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ statistics.maxScore }}</div>
            <div class="stat-label">最高分</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ statistics.minScore }}</div>
            <div class="stat-label">最低分</div>
          </div>
        </div>
        
        <!-- 分数分布统计 -->
        <!-- <div class="score-distribution">
          <h4>分数段分布</h4>
          <div class="distribution-chart">
            <div v-for="(count, range) in statistics.scoreDistribution" :key="range" 
                class="distribution-bar-container">
              <div class="range-label">{{ range }}</div>
              <div class="distribution-bar" 
                  :style="{width: `${(count / totalStudents) * 100}%`}" 
                  :class="getDistributionBarClass(range)">
                {{ count }}人 ({{ ((count / totalStudents) * 100).toFixed(1) }}%)
              </div>
            </div>
          </div>
        </div> -->
      </div>
      
      <!-- 学生成绩表格 -->
      <div class="scores-table-container">
        <el-divider content-position="left">学生成绩详情</el-divider>
        
        <!-- 搜索和筛选 -->
        <div class="filter-container">
          <!-- <el-select v-model="scoreFilter" placeholder="成绩筛选" style="width: 120px">
            <el-option label="全部成绩" value="all"></el-option>
            <el-option label="不及格" value="fail"></el-option>
            <el-option label="及格" value="pass"></el-option>
            <el-option label="优秀" value="excellent"></el-option>
          </el-select> -->
          <!-- <el-input
            v-model="searchText"
            placeholder="搜索学生ID或姓名"
            clearable
            style="width: 200px; margin-left: 10px"
          ></el-input> -->
        </div>
        
        <el-table :data="filteredStudentScores.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)" 
                 style="width: 100%; margin-top: 15px" 
                 :row-class-name="getTableRowClassName">
          <el-table-column label="序号" type="index" width="70"></el-table-column>
          <el-table-column prop="userId" label="学生ID" width="100"></el-table-column>
          <el-table-column label="学生姓名" width="150">
            <template #default="scope">
              {{ scope.row.userName || `学生${scope.row.userId}` }}
            </template>
          </el-table-column>
          <el-table-column prop="score" label="成绩" width="100">
            <template #default="scope">
              <span :class="'score-' + getScoreStatus(scope.row.score)">{{ scope.row.score }}</span>
            </template>
          </el-table-column>
          <!-- <el-table-column prop="isVerify" label="是否审核" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.isVerify === 1 ? 'success' : 'warning'">
                {{ scope.row.isVerify === 1 ? '已审核' : '未审核' }}
              </el-tag>
            </template>
          </el-table-column> -->
          <el-table-column prop="createTime" label="提交时间" min-width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="更新时间" min-width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.updateTime) }}
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页器 -->
        <div class="pagination-container">
          <el-pagination
            v-if="filteredStudentScores.length > pagination.pageSize"
            v-model:current-page="pagination.current"
            :page-size="pagination.pageSize"
            :total="filteredStudentScores.length"
            @current-change="handlePageChange"
            layout="total, prev, pager, next"
            background
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
// 非响应式的辅助函数
export default {
  methods: {
    // 根据分数设置表格行样式
    getTableRowClassName({ row }) {
      const score = Number(row.score)
      if (score >= 85) return 'excellent-row'
      if (score >= 60) return 'pass-row'
      return 'fail-row'
    },
    
    // 获取分数标签类型
    getScoreTagType(score) {
      const scoreNum = Number(score)
      if (scoreNum >= 85) return 'success'
      if (scoreNum >= 60) return ''
      return 'danger'
    },
    
    // 获取分数文本描述
    getScoreText(score) {
      const scoreNum = Number(score)
      if (scoreNum >= 85) return '优秀'
      if (scoreNum >= 60) return '及格'
      return '不及格'
    },
    
    // 格式化日期时间
    formatDateTime(dateTimeStr) {
      if (!dateTimeStr) return '-'
      const date = new Date(dateTimeStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    },

    // 获取分布条样式
    getDistributionBarClass(range) {
      if (range === '<60') return 'bar-fail'
      if (range === '60-70') return 'bar-pass'
      if (range === '70-80') return 'bar-good'
      if (range === '80-90') return 'bar-verygood'
      return 'bar-excellent'
    }
  }
}
</script>

<style scoped>
.exam-result-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.exam-info-card {
  margin-bottom: 20px;
}

.exam-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exam-title h3 {
  margin: 0;
}

.exam-info {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.info-item {
  margin-right: 30px;
  margin-bottom: 10px;
}

.label {
  font-weight: bold;
  margin-right: 8px;
}

.statistics-container {
  margin: 20px 0;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 6px;
  transition: all 0.3s;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.scores-table-container {
  margin-top: 20px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

/* 分数颜色 */
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

/* 表格行颜色 */
:deep(.excellent-row) {
  background-color: rgba(103, 194, 58, 0.1);
}

:deep(.pass-row) {
  background-color: rgba(64, 158, 255, 0.1);
}

:deep(.fail-row) {
  background-color: rgba(245, 108, 108, 0.1);
}

/* 分数分布图表 */
.score-distribution {
  margin-top: 30px;
  border-top: 1px solid #EBEEF5;
  padding-top: 20px;
}

.distribution-chart {
  margin-top: 15px;
}

.distribution-bar-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.range-label {
  width: 60px;
  text-align: right;
  margin-right: 10px;
  font-size: 14px;
  color: #606266;
}

.distribution-bar {
  height: 30px;
  min-width: 40px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 10px;
  border-radius: 4px;
  transition: all 0.3s;
  font-size: 12px;
}

.bar-fail {
  background-color: #F56C6C;
}

.bar-pass {
  background-color: #E6A23C;
}

.bar-good {
  background-color: #409EFF;
}

.bar-verygood {
  background-color: #67C23A;
}

.bar-excellent {
  background-color: #67C23A;
}

.filter-container {
  display: flex;
  align-items: center;
  margin: 15px 0;
}
</style> 