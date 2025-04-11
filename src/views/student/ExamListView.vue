<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const examList = ref([])
const loading = ref(true)

onMounted(() => {
  // 模拟获取考试列表数据
  setTimeout(() => {
    examList.value = [
      {
        id: 1,
        title: '2023年第一学期数学期末考试',
        startTime: '2023-12-20 14:00',
        endTime: '2023-12-20 16:00',
        duration: 120,
        status: 'upcoming',
        totalPoints: 100
      },
      {
        id: 2,
        title: '2023年第一学期英语测验',
        startTime: '2023-12-15 09:00',
        endTime: '2023-12-15 10:30',
        duration: 90,
        status: 'completed',
        totalPoints: 100
      },
      {
        id: 3,
        title: '2023年第一学期物理期中考试',
        startTime: '2023-11-10 14:00',
        endTime: '2023-11-10 16:00',
        duration: 120,
        status: 'completed',
        totalPoints: 100
      }
    ]
    loading.value = false
  }, 1000)
})

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

const handleTakeExam = (examId) => {
  router.push(`/student/take-exam/${examId}`)
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
              v-if="scope.row.status === 'upcoming' || scope.row.status === 'ongoing'"
              type="primary"
              size="small"
              @click="handleTakeExam(scope.row.id)"
            >
              进入考试
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
</style> 