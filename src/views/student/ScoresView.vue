<script setup>
import { ref, onMounted } from 'vue'

const scores = ref([])
const loading = ref(true)

onMounted(() => {
  // 模拟获取成绩数据
  setTimeout(() => {
    scores.value = [
      {
        id: 1,
        examName: '2023年第一学期数学期末考试',
        examDate: '2023-12-20',
        score: 85,
        totalScore: 100,
        rank: 15,
        totalStudents: 60
      },
      {
        id: 2,
        examName: '2023年第一学期英语测验',
        examDate: '2023-12-15',
        score: 92,
        totalScore: 100,
        rank: 8,
        totalStudents: 60
      },
      {
        id: 3,
        examName: '2023年第一学期物理期中考试',
        examDate: '2023-11-10',
        score: 78,
        totalScore: 100,
        rank: 25,
        totalStudents: 60
      }
    ]
    loading.value = false
  }, 1000)
})

const getScoreLevel = (score) => {
  if (score >= 90) return 'success'
  if (score >= 75) return 'warning'
  if (score >= 60) return ''
  return 'danger'
}
</script>

<template>
  <div class="scores-container">
    <div class="page-header">
      <h2>成绩查询</h2>
    </div>
    
    <el-card class="scores-card">
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
            第 {{ scope.row.rank }} / {{ scope.row.totalStudents }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="$router.push(`/student/take-exam/${scope.row.id}`)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <el-card class="chart-card" v-if="!loading">
      <div ref="chartRef" class="score-chart">
        <h3>成绩趋势</h3>
        <el-empty description="暂无成绩趋势数据"></el-empty>
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

.chart-card {
  width: 100%;
}

.score-chart {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style> 