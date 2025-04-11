<script setup>
import { ref, reactive, onMounted } from 'vue'

const peerReviewTasks = ref([])
const completedTasks = ref([])
const loading = ref(true)
const activeTab = ref('pending')

const reviewDialogVisible = ref(false)
const currentReview = reactive({
  id: null,
  examName: '',
  studentName: '',
  questions: [],
  answers: [],
  scoring: {}
})

onMounted(() => {
  // 模拟获取互评任务数据
  setTimeout(() => {
    peerReviewTasks.value = [
      {
        id: 1,
        examName: '2023年第一学期数学期末考试',
        studentName: '张三',
        date: '2023-12-22',
        deadline: '2023-12-25'
      },
      {
        id: 2,
        examName: '2023年第一学期英语测验',
        studentName: '李四',
        date: '2023-12-17',
        deadline: '2023-12-20'
      }
    ]
    
    completedTasks.value = [
      {
        id: 3,
        examName: '2023年第一学期物理期中考试',
        studentName: '王五',
        date: '2023-11-12',
        completedDate: '2023-11-14',
        score: 85
      }
    ]
    
    loading.value = false
  }, 1000)
})

const handleStartReview = (task) => {
  // 模拟获取试卷详情
  setTimeout(() => {
    currentReview.id = task.id
    currentReview.examName = task.examName
    currentReview.studentName = task.studentName
    currentReview.questions = [
      {
        id: 1,
        type: 'text',
        content: '简述Vue组合式API的优势',
        points: 10,
        referenceAnswer: 'Vue组合式API的优势包括更好的代码组织、逻辑复用、类型推导支持以及更小的生产包体积。'
      },
      {
        id: 2,
        type: 'text',
        content: '请解释Vue中ref和reactive的区别',
        points: 10,
        referenceAnswer: 'ref用于基本类型的响应式，reactive用于引用类型的响应式。ref需要通过.value访问，而reactive不需要。ref自动解包在模板中，reactive不能解构或展开。'
      }
    ]
    currentReview.answers = [
      {
        questionId: 1,
        answer: 'Vue组合式API可以让我们按照功能逻辑组织代码，比选项式API更灵活，可以将相关功能的代码放在一起，提高了代码的可维护性。'
      },
      {
        questionId: 2,
        answer: 'ref用于简单数据类型，reactive用于对象。ref需要使用.value获取值，在模板中会自动解包。'
      }
    ]
    
    // 初始化评分
    currentReview.questions.forEach(q => {
      currentReview.scoring[q.id] = {
        score: 0,
        comment: ''
      }
    })
    
    reviewDialogVisible.value = true
  }, 500)
}

const handleSubmitReview = () => {
  // 模拟提交评分
  setTimeout(() => {
    // 关闭对话框
    reviewDialogVisible.value = false
    
    // 更新任务列表
    const taskIndex = peerReviewTasks.value.findIndex(task => task.id === currentReview.id)
    if (taskIndex !== -1) {
      const task = peerReviewTasks.value[taskIndex]
      
      // 计算总分
      let totalScore = 0
      Object.values(currentReview.scoring).forEach(score => {
        totalScore += score.score
      })
      
      // 将任务从待评价移动到已完成
      completedTasks.value.unshift({
        id: task.id,
        examName: task.examName,
        studentName: task.studentName,
        date: task.date,
        completedDate: new Date().toISOString().split('T')[0],
        score: totalScore
      })
      
      peerReviewTasks.value.splice(taskIndex, 1)
    }
  }, 1000)
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
</style> 