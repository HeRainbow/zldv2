<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(true)
const searchText = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const examList = ref([])
const classMap = ref({}) // 用于存储班级ID和班级名称的映射

// 获取班级信息
const fetchClassList = async () => {
  try {
    const userInfo = getUserInfo()
    
    if (!userInfo || !userInfo.id) {
      console.error('获取用户信息失败')
      return
    }
    
    const res = await request({
      url: '/class/listClass',
      method: 'post',
      data: {
        current: 1,
        pageSize: 100, // 获取足够多的班级
        sortField: "",
        sortOrder: "",
        teacherId: userInfo.id
      }
    })
    
    if (res.code === 0 && res.data) {
      // 将班级列表转换为Map对象，方便通过ID查找班级名称
      const classes = res.data.records || []
      classes.forEach(cls => {
        classMap.value[cls.id] = cls.name
      })
    }
  } catch (error) {
    console.error('获取班级列表失败', error)
  }
}

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

// 获取考试列表
const fetchExamList = async () => {
  loading.value = true
  
  try {
    const res = await request({
      url: '/exam/get/teacher',
      method: 'post',
      data: {
        current: currentPage.value,
        pageSize: pageSize.value,
        sortField: "",
        sortOrder: ""
      }
    })
    
    if (res.code === 0 && res.data) {
      // 将后端返回的考试数据处理成组件需要的格式
      const examData = res.data.records || []
      examList.value = examData.map(item => {
        // 计算考试时长（分钟）
        const startTime = new Date(item.startTime)
        const endTime = new Date(item.endTime)
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60))
        
        // 计算考试状态
        const now = new Date()
        let status = 'upcoming'
        if (now > endTime) {
          status = 'completed'
        } else if (now >= startTime && now <= endTime) {
          status = 'ongoing'
        }
        
        // 格式化时间
        const formatTime = (timeStr) => {
          const date = new Date(timeStr)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        }
        
        return {
          id: item.id,
          title: item.name,
          classId: item.classId,
          classNames: [classMap.value[item.classId] || `班级(${item.classId})`],
          startTime: formatTime(item.startTime),
          endTime: formatTime(item.endTime),
          duration: durationMinutes,
          totalStudents: 0, // 后端数据中没有，可以后续添加
          submittedCount: 0, // 后端数据中没有，可以后续添加
          status: status,
          createTime: formatTime(item.createTime)
        }
      })
      
      total.value = parseInt(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '获取考试列表失败')
    }
  } catch (error) {
    console.error('获取考试列表失败', error)
    ElMessage.error('获取考试列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 页码变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchExamList()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchExamList()
}

onMounted(async () => {
  // 先获取班级信息
  await fetchClassList()
  // 再获取考试列表
  fetchExamList()
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
  router.push(`/teacher/exam-result/${examId}`)
}

const handleViewExamDetail = (examId) => {
  // 跳转到考试详情页面
  router.push(`/teacher/exam-detail/${examId}`)
}

const handleEditExam = (examId) => {
  // 实际应用中应该跳转到编辑页面
  router.push(`/teacher/edit-exam/${examId}`)
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
  ).then(async () => {
    try {
      // 调用删除接口
      const res = await request({
        url: '/exam/delete',
        method: 'post',
        data: { id: exam.id }
      })
      
      if (res.code === 0) {
        ElMessage({
          type: 'success',
          message: '删除成功'
        })
        // 重新获取考试列表
        fetchExamList()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除考试失败', error)
      ElMessage.error('删除考试失败，请稍后重试')
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
        <el-table-column prop="createTime" label="创建时间" width="150"></el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button 
              type="info" 
              size="small" 
              @click="handleViewExamDetail(scope.row.id)"
            >
              查看详情
            </el-button>
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
      
      <!-- 分页器 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
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

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 