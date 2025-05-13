<script setup>
import { ref, reactive, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const peerReviewTasks = ref([])
const completedTasks = ref([])
const loading = ref(true)
const activeTab = ref('pending')

// 分页相关参数
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const reviewDialogVisible = ref(false)
const currentReview = reactive({
  id: null,
  examName: '',
  studentName: '',
  questions: [],
  answers: [],
  scoring: {}
})

// 从后端获取考试列表数据
const fetchExamList = async () => {
  loading.value = true
  try {
    // 使用封装好的request发送请求
    const response = await request.post('/exam/get/student', {
      current: pagination.value.current,
      pageSize: pagination.value.pageSize,
      sortField: "",
      sortOrder: ""
    })
    
    if (response.code === 0) {
      // 获取数据并转换格式
      const { records, total } = response.data
      pagination.value.total = parseInt(total)
      
      // 将后端数据转换为前端所需的数据结构
      // 这里暂时将所有考试作为互评任务（实际项目中需要根据实际互评任务API进行调整）
      peerReviewTasks.value = records.map(item => {
        // 格式化时间显示
        const formatDate = (date) => {
          return new Date(date).toLocaleDateString('zh-CN')
        }
        
        return {
          id: item.id,
          examName: item.name,
          studentName: '待分配学生', // 实际项目中需要从后端获取具体学生信息
          date: formatDate(item.createTime),
          deadline: formatDate(item.endTime)
        }
      })
      
      // 模拟已完成的评阅任务（实际项目中需要调用相应API）
      completedTasks.value = [{
        id: 3,
        examName: '2023年第一学期物理期中考试',
        studentName: '王五',
        date: '2023-11-12',
        completedDate: '2023-11-14',
        score: 85
      }]
    } else {
      // 请求失败处理
      console.error('获取互评任务列表失败:', response.message)
      ElMessage.error(`获取互评任务列表失败: ${response.message}`)
    }
    
  } catch (error) {
    console.error('获取互评任务列表出错:', error)
    ElMessage.error('获取互评任务列表时发生错误，请稍后重试')
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

const handleStartReview = async (task) => {
  loading.value = true
  try {
    // 调用互评接口获取详情数据
    const response = await request.post('/peer/get/others', {
      id: task.id
    })
    
    if (response.code === 0 && response.data.length > 0) {
      // 设置当前评阅数据
      currentReview.id = task.id
      currentReview.examName = task.examName
      
      // 假设第一个数据中的学生ID是相同的（通常同一个学生的多个题目）
      currentReview.studentName = `用户ID: ${response.data[0].submit.userId}` 
      
      // 清空之前的问题和答案
      currentReview.questions = []
      currentReview.answers = []
      currentReview.scoring = {}
      
      // 处理所有返回的问题数据
      response.data.forEach(peerReviewData => {
        // 添加问题
        currentReview.questions.push({
          id: peerReviewData.question.id,
          type: 'text',
          content: peerReviewData.question.title,
          points: peerReviewData.score || 10, // 使用题目总分，如果没有则默认10分
          referenceAnswer: peerReviewData.question.answer || '暂无参考答案'
        })
        
        // 添加答案
        currentReview.answers.push({
          questionId: peerReviewData.question.id,
          answer: peerReviewData.submit.answer || '暂无答案' // 如果答案为空，显示默认文本
        })
        
        // 设置评分数据
        // 如果已有评分，则使用已有的
        const existingScore = peerReviewData.peerReview.score || 0
        const existingComment = peerReviewData.peerReview.comment || ''
        
        currentReview.scoring[peerReviewData.question.id] = {
          score: existingScore,
          comment: existingComment,
          // 保存互评ID，用于后续提交评分
          peerReviewId: peerReviewData.peerReview.id
        }
      })
      
      // 显示评阅对话框
      reviewDialogVisible.value = true
    } else {
      ElMessage.warning('没有找到互评任务或数据为空')
    }
  } catch (error) {
    console.error('获取互评任务详情失败:', error)
    ElMessage.error('获取互评任务详情失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSubmitReview = async () => {
  loading.value = true
  try {
    // 收集所有评阅结果
    const reviewResults = []
    
    // 为每个题目创建一个评阅结果
    for (const questionId in currentReview.scoring) {
      const scoringData = currentReview.scoring[questionId]
      reviewResults.push({
        peerReviewId: scoringData.peerReviewId,
        score: scoringData.score,
        comment: scoringData.comment
      })
    }
    
    // 在实际项目中，这里应该调用提交评阅的API
    // 示例：可以采用Promise.all一次性提交所有评阅，或者逐个提交
    /*
    const promises = reviewResults.map(result => 
      request.post('/peer/submit', {
        peerReviewId: result.peerReviewId,
        score: result.score,
        comment: result.comment
      })
    )
    
    const results = await Promise.all(promises)
    
    // 检查是否所有请求都成功
    const allSuccess = results.every(res => res.code === 0)
    
    if (allSuccess) {
      ElMessage.success('所有评阅提交成功')
    } else {
      ElMessage.error('部分评阅提交失败，请重试')
      return // 如果提交失败，不关闭对话框
    }
    */
    
    // 暂时使用模拟数据
    // 模拟提交成功
    ElMessage.success('评阅提交成功')
    
    // 关闭对话框
    reviewDialogVisible.value = false
    
    // 更新任务列表
    const taskIndex = peerReviewTasks.value.findIndex(task => task.id === currentReview.id)
    if (taskIndex !== -1) {
      const task = peerReviewTasks.value[taskIndex]
      
      // 计算总分
      let totalScore = calculateTotalScore()
      
      // 将任务从待评价移动到已完成
      completedTasks.value.unshift({
        id: task.id,
        examName: task.examName,
        studentName: currentReview.studentName,
        date: task.date,
        completedDate: new Date().toISOString().split('T')[0],
        score: totalScore
      })
      
      // 从待评价列表中移除
      peerReviewTasks.value.splice(taskIndex, 1)
      
      // 刷新列表
      fetchExamList()
    }
  } catch (error) {
    console.error('提交评阅失败:', error)
    ElMessage.error('提交评阅失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const getAnswer = (questionId) => {
  const answer = currentReview.answers.find(a => a.questionId === questionId)
  return answer ? answer.answer : ''
}

const calculateTotalScore = () => {
  let total = 0
  Object.values(currentReview.scoring).forEach(score => {
    total += score.score
  })
  return total
}

const getMaxScore = () => {
  let total = 0
  currentReview.questions.forEach(q => {
    total += q.points
  })
  return total
}
</script>

<template>
  <div class="peer-review-container">
    <div class="page-header">
      <h2>试卷互评</h2>
    </div>
    
    <el-tabs v-model="activeTab" class="review-tabs">
      <el-tab-pane label="待评阅试卷" name="pending">
        <el-table :data="peerReviewTasks" v-loading="loading" style="width: 100%">
          <el-table-column prop="examName" label="考试名称" min-width="250"></el-table-column>
          <el-table-column prop="studentName" label="学生姓名" width="150"></el-table-column>
          <el-table-column prop="date" label="分配日期" width="150"></el-table-column>
          <el-table-column prop="deadline" label="截止日期" width="150"></el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleStartReview(scope.row)">
                开始评阅
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-empty v-if="peerReviewTasks.length === 0 && !loading" description="暂无待评阅试卷"></el-empty>
        
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
      </el-tab-pane>
      
      <el-tab-pane label="已完成评阅" name="completed">
        <el-table :data="completedTasks" v-loading="loading" style="width: 100%">
          <el-table-column prop="examName" label="考试名称" min-width="250"></el-table-column>
          <el-table-column prop="studentName" label="学生姓名" width="150"></el-table-column>
          <el-table-column prop="date" label="分配日期" width="150"></el-table-column>
          <el-table-column prop="completedDate" label="完成日期" width="150"></el-table-column>
          <el-table-column prop="score" label="评分" width="100">
            <template #default="scope">
              <el-tag>{{ scope.row.score }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button type="info" size="small">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <el-empty v-if="completedTasks.length === 0 && !loading" description="暂无已完成评阅"></el-empty>
      </el-tab-pane>
    </el-tabs>
    
    <!-- 评阅对话框 -->
    <el-dialog
      v-model="reviewDialogVisible"
      title="试卷评阅"
      width="70%"
      :before-close="() => reviewDialogVisible = false"
    >
      <div class="review-dialog-content">
        <div class="review-header">
          <h3>{{ currentReview.examName }}</h3>
          <p>学生: {{ currentReview.studentName }}</p>
        </div>
        
        <div v-for="question in currentReview.questions" :key="question.id" class="review-question-item">
          <div class="question-header">
            <h4>问题: {{ question.content }}</h4>
            <p class="question-points">满分: {{ question.points }}分</p>
          </div>
          
          <el-divider content-position="left">参考答案</el-divider>
          <div class="reference-answer">{{ question.referenceAnswer }}</div>
          
          <el-divider content-position="left">学生答案</el-divider>
          <div class="student-answer">{{ getAnswer(question.id) }}</div>
          
          <el-divider content-position="left">评分</el-divider>
          <div class="scoring-section">
            <el-form label-position="top">
              <el-form-item label="分数">
                <el-input-number
                  v-model="currentReview.scoring[question.id].score"
                  :min="0"
                  :max="question.points"
                  :step="0.5"
                  controls-position="right"
                ></el-input-number>
              </el-form-item>
              <el-form-item label="评语">
                <el-input
                  v-model="currentReview.scoring[question.id].comment"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入评语"
                ></el-input>
              </el-form-item>
            </el-form>
          </div>
        </div>
        
        <div class="review-summary">
          <h4>总分: {{ calculateTotalScore() }} / {{ getMaxScore() }}</h4>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reviewDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitReview">提交评阅</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.peer-review-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.review-tabs {
  background-color: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.review-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 20px;
}

.review-header {
  margin-bottom: 20px;
}

.review-question-item {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-points {
  color: #F56C6C;
}

.reference-answer, .student-answer {
  padding: 10px;
  background-color: #f8f8f8;
  border-radius: 4px;
  white-space: pre-wrap;
}

.reference-answer {
  color: #67c23a;
}

.scoring-section {
  margin-top: 20px;
}

.review-summary {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style> 