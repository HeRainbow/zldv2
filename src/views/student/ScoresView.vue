<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const scores = ref([])
const loading = ref(true)

// 从后端获取成绩数据
const fetchScores = async () => {
  loading.value = true
  try {
    // 调用成绩查询接口
    const response = await request.post('/score/student/list', {
      current: 1,
      pageSize: 50 // 假设每页最多显示50条成绩
    })
    
    if (response.code === 0) {
      console.log('成绩数据:', response.data)
      
      // 处理后端返回的成绩数据
      if (response.data && response.data.records) {
        scores.value = response.data.records.map(item => {
          return {
            id: item.id,
            examId: item.examId,
            examName: item.examName || '未命名考试',
            examDate: formatExamDate(item.createTime),
            score: item.score || 0,
            totalScore: item.totalScore || 100,
            rank: item.rank || '-',
            totalStudents: item.totalStudents || '-'
          }
        })
      } else {
        scores.value = []
      }
    } else {
      ElMessage.error(`获取成绩失败: ${response.message}`)
      scores.value = []
    }
  } catch (error) {
    console.error('获取成绩出错:', error)
    ElMessage.error('获取成绩数据时发生错误，请稍后重试')
    scores.value = []
  } finally {
    loading.value = false
  }
}

// 格式化考试日期
const formatExamDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-')
  } catch (e) {
    return dateStr
  }
}

onMounted(() => {
  fetchScores()
})

const getScoreLevel = (score) => {
  if (score >= 90) return 'success'
  if (score >= 75) return 'warning'
  if (score >= 60) return ''
  return 'danger'
}

// 查看考试详情
const viewExamDetail = (examId) => {
  // 跳转到考试详情页面
  router.push(`/student/exam-detail/${examId}`)
}
</script>

<template>
  <div class="scores-container">
    <div class="page-header">
      <h2>成绩查询</h2>
    </div>
    
    <el-card class="scores-card">
      <div class="score-header">
        <div></div>
        <el-button type="primary" @click="fetchScores" :loading="loading">
          刷新数据
        </el-button>
      </div>
      
      <el-table :data="scores" v-loading="loading" style="width: 100%">
        <el-table-column prop="examName" label="考试名称" min-width="250"></el-table-column>
        <el-table-column prop="examDate" label="考试日期" width="150"></el-table-column>
        <el-table-column prop="score" label="得分" width="150">
          <template #default="scope">
            <el-tag :type="getScoreLevel(scope.row.score)">
              {{ scope.row.score }} / {{ scope.row.totalScore }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排名" width="150">
          <template #default="scope">
            <span v-if="scope.row.rank !== '-'">
              第 {{ scope.row.rank }} / {{ scope.row.totalStudents }}
            </span>
            <span v-else>排名未计算</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewExamDetail(scope.row.examId)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="empty-data" v-if="scores.length === 0 && !loading">
        <el-empty description="暂无成绩数据"></el-empty>
      </div>
    </el-card>
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

.empty-data {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}
</style> 