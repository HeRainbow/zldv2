<script setup>
import { ref, reactive, onMounted, nextTick, h } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

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
  reviewItems: [],
  questions: [],
  answers: []
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

/**
 * 获取问题状态的CSS类名
 * @param {number} index 问题索引
 * @returns {string} CSS类名
 */
const getQuestionStatusClass = (index) => {
  if (!currentReview.reviewItems[index]) return 'status-pending'
  return currentReview.reviewItems[index].submitted ? 'status-completed' : 'status-pending'
}

/**
 * 获取问题状态的文本描述
 * @param {number} index 问题索引
 * @returns {string} 状态文本
 */
const getQuestionStatusText = (index) => {
  if (!currentReview.reviewItems[index]) return '待评阅'
  return currentReview.reviewItems[index].submitted ? '已完成评阅' : '待评阅'
}

/**
 * 开始评阅任务
 * @param {Object} task 评阅任务对象
 */
const handleStartReview = async (task) => {
  loading.value = true
  try {
    // 调用互评接口获取详情数据
    const response = await request.post('/peer/get/others', {
      id: task.id
    })
    
    if (response.code === 0 && response.data && response.data.length > 0) {
      console.log('互评任务数据:', response.data) // 用于调试
      
      // 设置当前评阅数据
      currentReview.id = task.id
      currentReview.examName = task.examName
      
      // 假设第一个数据中的学生ID是相同的（通常同一个学生的多个题目）
      const studentId = response.data[0].submit ? response.data[0].submit.userId : '未知'
      currentReview.studentName = `用户ID: ${studentId}` 
      
      // 清空之前的数据
      currentReview.questions = []
      currentReview.answers = []
      currentReview.reviewItems = []
      
      // 处理所有返回的问题数据
      response.data.forEach((peerReviewData, index) => {
        try {
          // 确保问题数据存在
          if (!peerReviewData.question) {
            console.warn('问题数据不完整:', peerReviewData)
            return
          }
          
          const questionId = peerReviewData.question.id
          const uniqueId = `${questionId}_${index}` // 创建唯一标识
          
          // 添加问题
          currentReview.questions.push({
            id: questionId,
            uniqueId: uniqueId, // 添加唯一标识
            type: peerReviewData.question.type || 'text', // 获取题目类型
            content: peerReviewData.question.title || '未知题目',
            points: peerReviewData.score || 10, // 使用题目总分，如果没有则默认10分
            referenceAnswer: peerReviewData.question.answer || '暂无参考答案',
            index: index // 添加索引，用于关联reviewItem
          })
          
          // 添加答案（确保submit存在）
          if (peerReviewData.submit) {
            currentReview.answers.push({
              questionId: questionId,
              uniqueId: uniqueId, // 添加唯一标识
              answer: peerReviewData.submit.answer || '暂无答案'
            })
          } else {
            currentReview.answers.push({
              questionId: questionId,
              uniqueId: uniqueId, // 添加唯一标识
              answer: '未找到提交记录'
            })
          }
          
          // 设置评分数据（确保peerReview存在）
          if (peerReviewData.peerReview) {
            const existingScore = peerReviewData.peerReview.score || 0
            const existingComment = peerReviewData.peerReview.comment || ''
            const peerReviewStatus = peerReviewData.peerReview.status || 0
            
            // 添加到评阅项目数组
            currentReview.reviewItems.push({
              questionId: questionId,
              uniqueId: uniqueId, // 添加唯一标识
              index: index,
              score: existingScore,
              comment: existingComment,
              // 保存整个peerReview对象，确保能够获取到正确的id
              peerReview: peerReviewData.peerReview,
              // 根据status判断是否已提交/完成
              submitting: false,
              submitted: peerReviewStatus === 1, // status=1表示已完成评阅
              status: peerReviewStatus
            })
          } else {
            // 如果没有找到互评记录，创建一个空的默认记录
            console.warn('未找到互评记录，创建默认记录:', peerReviewData)
            currentReview.reviewItems.push({
              questionId: questionId,
              uniqueId: uniqueId,
              index: index,
              score: 0,
              comment: '',
              submitting: false,
              submitted: false,
              status: 0,
              error: '未找到互评记录，请联系管理员' // 添加错误信息
            })
          }
        } catch (err) {
          console.error('处理问题数据时出错:', err, peerReviewData)
        }
      })
      
      // 检查是否成功处理了问题
      if (currentReview.questions.length > 0) {
        // 显示评阅对话框
        reviewDialogVisible.value = true
      } else {
        ElMessage.warning('没有找到可评阅的题目')
      }
    } else {
      const errorMsg = response.message || '没有找到互评任务或数据为空'
      console.warn('获取互评数据失败:', errorMsg, response)
      ElMessage.warning(errorMsg)
    }
  } catch (error) {
    console.error('获取互评任务详情失败:', error)
    ElMessage.error('获取互评任务详情失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 根据唯一标识获取评阅项目
 * @param {string} uniqueId 题目唯一标识
 * @returns {Object|null} 评阅项目
 */
const getReviewItem = (uniqueId) => {
  return currentReview.reviewItems.find(item => item.uniqueId === uniqueId) || null
}

/**
 * 根据唯一标识获取答案
 * @param {string} uniqueId 题目唯一标识
 * @returns {string} 答案内容
 */
const getAnswer = (uniqueId) => {
  const answer = currentReview.answers.find(a => a.uniqueId === uniqueId)
  return answer ? answer.answer : ''
}

/**
 * 提交单个题目的评阅
 * @param {string} uniqueId 题目唯一标识
 */
const handleSubmitSingleReview = async (uniqueId) => {
  // 获取当前题目的评分数据
  const reviewItem = getReviewItem(uniqueId)
  
  if (!reviewItem) {
    ElMessage.error('未找到评分数据')
    return
  }
  
  // 如果已经提交过，显示提示并返回
  if (reviewItem.submitted) {
    ElMessage.warning('该题目已完成评阅，无需重复提交')
    return
  }
  
  // 检查是否有错误信息
  if (reviewItem.error) {
    ElMessage.error(reviewItem.error)
    return
  }
  
  // 确保peerReview对象存在
  if (!reviewItem.peerReview || !reviewItem.peerReview.id) {
    ElMessage.error('缺少互评ID信息，无法提交')
    return
  }
  
  // 检查分数是否有效
  if (reviewItem.score === undefined || reviewItem.score < 0) {
    ElMessage.warning('请输入有效的评分')
    return
  }
  
  // 设置提交状态
  reviewItem.submitting = true
  
  try {
    // 使用peerReview对象中的id
    const peerReviewId = reviewItem.peerReview.id
    
    console.log('提交评阅数据:', {
      id: peerReviewId,
      score: reviewItem.score,
      comment: reviewItem.comment || ''
    })
    
    // 调用接口提交评阅
    const response = await request.post('/peer/do', {
      id: peerReviewId,
      score: reviewItem.score,
      comment: reviewItem.comment || '' // 确保comment不为undefined或null
    })
    
    if (response.code === 0) {
      ElMessage.success('评阅提交成功')
      // 标记为已提交
      reviewItem.submitted = true
      // 更新状态为已完成评阅
      reviewItem.status = 1
      
      // 检查是否所有题目都已提交
      const allSubmitted = currentReview.reviewItems.every(item => item.submitted)
      if (allSubmitted) {
        ElMessage.success('所有题目已评阅完成')
        
        // 如果全部提交了，可以更新任务列表
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
      }
    } else {
      ElMessage.error(`评阅提交失败: ${response.message || '未知错误'}`)
    }
  } catch (error) {
    console.error('提交评阅失败:', error)
    ElMessage.error('提交评阅失败，请稍后重试')
  } finally {
    // 重置提交状态
    reviewItem.submitting = false
  }
}

/**
 * 计算已提交的评阅总分
 */
const calculateTotalScore = () => {
  let total = 0
  currentReview.reviewItems.forEach(item => {
    if (item.submitted) {
      total += item.score
    }
  })
  return total
}

/**
 * 获取所有题目的总分
 */
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
      
      <!-- <el-tab-pane label="已完成评阅" name="completed">
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
      </el-tab-pane> -->
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
        
        <div v-for="question in currentReview.questions" :key="question.uniqueId" class="review-question-item">
          <!-- 题目状态标识 -->
          <div class="question-status-tag" :class="getQuestionStatusClass(question.index)">
            {{ getQuestionStatusText(question.index) }}
          </div>
          
          <div class="question-header">
            <h4>问题: {{ question.content }}</h4>
            <p class="question-points">满分: {{ question.points }}分</p>
          </div>
          
          <el-divider content-position="left">参考答案</el-divider>
          <div class="reference-answer">{{ question.referenceAnswer }}</div>
          
          <el-divider content-position="left">学生答案</el-divider>
          <div class="student-answer">{{ getAnswer(question.uniqueId) }}</div>
          
          <el-divider content-position="left">评分</el-divider>
          <div class="scoring-section">
            <el-form label-position="top">
              <el-form-item label="分数">
                <el-input-number
                  v-model="currentReview.reviewItems[question.index].score"
                  :min="0"
                  :max="question.points"
                  :step="0.5"
                  controls-position="right"
                  :disabled="currentReview.reviewItems[question.index].submitted"
                ></el-input-number>
                <span class="score-hint">（满分{{ question.points }}分）</span>
              </el-form-item>
              <el-form-item label="评语">
                <el-input
                  v-model="currentReview.reviewItems[question.index].comment"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入评语"
                  :disabled="currentReview.reviewItems[question.index].submitted"
                ></el-input>
              </el-form-item>
              <!-- 为每个题目添加单独的提交按钮 -->
              <el-form-item>
                <el-button 
                  v-if="!currentReview.reviewItems[question.index].submitted"
                  type="primary" 
                  @click="handleSubmitSingleReview(question.uniqueId)"
                  :loading="currentReview.reviewItems[question.index].submitting"
                >
                  提交此题评阅
                </el-button>
                <el-tag v-if="currentReview.reviewItems[question.index].submitted" type="success" class="ml-2">
                  已完成评阅
                </el-tag>
                <el-tag v-if="currentReview.reviewItems[question.index].error" type="danger" class="ml-2">
                  {{ currentReview.reviewItems[question.index].error }}
                </el-tag>
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
          <el-button @click="reviewDialogVisible = false">关闭</el-button>
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
  position: relative;
  transition: all 0.3s;
}

.review-question-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.question-status-tag {
  position: absolute;
  top: 0;
  right: 0;
  padding: 4px 8px;
  color: white;
  font-size: 12px;
  border-radius: 0 4px 0 4px;
}

.status-pending {
  background-color: #409EFF;
}

.status-completed {
  background-color: #67C23A;
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

/* 新增样式 */
.ml-2 {
  margin-left: 8px;
}

.score-hint {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}
</style> 