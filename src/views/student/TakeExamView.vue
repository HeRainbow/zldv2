<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const examId = route.params.id
const loading = ref(true)
const submitting = ref(false)
const remainingTime = ref(0)
const timer = ref(null)

// 考试数据结构
const exam = reactive({
  id: null,
  title: '',
  totalPoints: 0,
  startTime: '',
  endTime: '',
  duration: 0,
  programQuestions: [],
  optionalQuestions: [],
  blankQuestions: [],
  judgementQuestions: [],
  questionCount: 0
})

// 用户答案
const answers = ref({
  // 题目ID: 答案
  program: {}, // 编程题
  optional: {}, // 选择题
  blank: {}, // 填空题
  judgement: {} // 判断题
})

// 处理选择题答案选择
const handleOptionalAnswer = async (questionId, answer) => {
  // 首先更新本地答案
  answers.value.optional[questionId] = answer
  
  // 然后提交到后端
  try {
    console.log(`提交选择题答案: 题目ID=${questionId}, 答案=${answer}`)
    
    // 准备提交数据
    const submitData = {
      answer: answer,
      questionId: parseInt(questionId),
      examId: parseInt(exam.id)
    }
    
    // 显示提交状态
    ElMessage({
      message: `正在提交答案: ${answer}`,
      type: 'info',
      duration: 1000
    })
    
    // 调用接口提交答案
    const response = await request.post('/op/submit/do', submitData)
    
    if (response.code === 0) {
      console.log(`选择题 ${questionId} 答案已提交成功: ${answer}`)
      ElMessage({
        message: `答案 ${answer} 提交成功`,
        type: 'success',
        duration: 1000
      })
    } else {
      console.error(`提交选择题答案失败: ${response.message}`)
      ElMessage.warning(`答案提交失败: ${response.message}`)
    }
  } catch (error) {
    console.error('提交选择题答案出错:', error)
    ElMessage.error('提交答案出错，请重试')
  }
}

// 处理判断题答案选择
const handleJudgementAnswer = async (questionId, answer) => {
  // 首先更新本地答案
  answers.value.judgement[questionId] = answer
  
  // 然后提交到后端
  try {
    // 将布尔值转换为0或1
    const answerValue = answer === true ? 1 : 0
    console.log(`提交判断题答案: 题目ID=${questionId}, 答案=${answer}, 提交值=${answerValue}`)
    
    // 准备提交数据
    const submitData = {
      answer: answerValue,
      questionId: parseInt(questionId),
      examId: parseInt(exam.id)
    }
    
    // 显示提交状态
    ElMessage({
      message: `正在提交答案: ${answer ? '正确' : '错误'}`,
      type: 'info',
      duration: 1000
    })
    
    // 调用接口提交答案
    const response = await request.post('/judge/submit/do', submitData)
    
    if (response.code === 0) {
      console.log(`判断题 ${questionId} 答案已提交成功: ${answerValue}`)
      ElMessage({
        message: `答案 ${answer ? '正确' : '错误'} 提交成功`,
        type: 'success',
        duration: 1000
      })
    } else {
      console.error(`提交判断题答案失败: ${response.message}`)
      ElMessage.warning(`答案提交失败: ${response.message}`)
    }
  } catch (error) {
    console.error('提交判断题答案出错:', error)
    ElMessage.error('提交答案出错，请重试')
  }
}

onMounted(() => {
  // 从localStorage获取考试数据
  try {
    const examDataStr = localStorage.getItem('currentExamData')
    if (!examDataStr) {
      ElMessage.error('考试数据不存在，请返回考试列表重新进入')
      router.push('/student/exams')
      return
    }
    
    // 解析考试数据
    const examData = JSON.parse(examDataStr)
    console.log('原始考试数据:', examData)
    
    // 检查数据有效性
    if (!examData || !examData.id) {
      ElMessage.error('考试数据无效，请返回考试列表重新进入')
      router.push('/student/exams')
      return
    }

    // 设置考试基本信息
    exam.id = examData.id
    exam.startTime = new Date(examData.startTime)
    exam.endTime = new Date(examData.endTime)
    
    // 计算考试时长（分钟）
    const durationMs = exam.endTime - exam.startTime
    exam.duration = Math.floor(durationMs / (1000 * 60))
    
    // 计算剩余时间
    const now = new Date()
    const endTimeMs = exam.endTime.getTime()
    const remainingMs = endTimeMs - now.getTime()
    remainingTime.value = Math.max(0, Math.floor(remainingMs / 1000))
    
    // 设置考试总分
    exam.totalPoints = examData.allScore || 0
    
    // 处理编程题
    if (examData.programList) {
      const programList = Object.entries(examData.programList)
      console.log('编程题数据:', programList)
      
      exam.programQuestions = programList.map(([questionStr, points]) => {
        try {
          console.log('处理编程题字符串:', questionStr)
          
          // 解析编程题字符串
          const idMatch = questionStr.match(/id=(\d+)/)
          const titleMatch = questionStr.match(/title=([^,]+)/)
          const contentMatch = questionStr.match(/content=([^,]+)/)
          
          // 提取默认程序代码
          const defaultProgramMatch = questionStr.match(/defaultProgram=([^,\)]+)/)
          const defaultProgram = defaultProgramMatch ? defaultProgramMatch[1] : ''
          console.log('默认程序代码:', defaultProgram)
          
          // 特殊处理tags字段，它是JSON格式
          let tags = []
          const tagsPattern = /tags=(\[[^\]]*\])/
          const tagsMatch = questionStr.match(tagsPattern)
          if (tagsMatch && tagsMatch[1]) {
            try {
              // 处理引号问题：字符串中可能包含转义的引号
              const tagsStr = tagsMatch[1].replace(/\\"/g, '"')
              tags = JSON.parse(tagsStr)
            } catch (e) {
              console.error('解析tags失败:', e)
            }
          }
          
          // 初始化编程题答案，使用defaultProgram作为初始值
          const id = idMatch ? idMatch[1] : null
          if (id) {
            answers.value.program[id] = defaultProgram
          }
          
          return {
            id: id,
            type: 'program',
            title: titleMatch ? titleMatch[1] : '未知题目',
            content: contentMatch && contentMatch[1] !== 'null' ? contentMatch[1] : '',
            defaultProgram: defaultProgram,
            tags: tags,
            points: points
          }
        } catch (error) {
          console.error('解析编程题出错:', error, questionStr)
          return null
        }
      }).filter(q => q !== null)
    }
    
    // 处理选择题
    if (examData.optionalList) {
      const optionalList = Object.entries(examData.optionalList)
      console.log('选择题数据:', optionalList)
      
      exam.optionalQuestions = optionalList.map(([questionStr, points]) => {
        try {
          console.log('处理选择题字符串:', questionStr)
          
          // 更精确的正则表达式
          const idMatch = questionStr.match(/id=(\d+)/)
          const titleMatch = questionStr.match(/title=([^,]+)/)
          
          // 使用更精确的模式匹配选项
          const optionAPattern = /optionA=([^,\)]+)/
          const optionBPattern = /optionB=([^,\)]+)/
          const optionCPattern = /optionC=([^,\)]+)/
          const optionDPattern = /optionD=([^,\)]+)/
          
          const optionAMatch = questionStr.match(optionAPattern)
          const optionBMatch = questionStr.match(optionBPattern)
          const optionCMatch = questionStr.match(optionCPattern)
          const optionDMatch = questionStr.match(optionDPattern)
          
          console.log('选项A匹配:', optionAMatch ? optionAMatch[1] : '未找到')
          console.log('选项B匹配:', optionBMatch ? optionBMatch[1] : '未找到')
          console.log('选项C匹配:', optionCMatch ? optionCMatch[1] : '未找到')
          console.log('选项D匹配:', optionDMatch ? optionDMatch[1] : '未找到')
          
          // 初始化选择题答案
          const id = idMatch ? idMatch[1] : null
          if (id) {
            answers.value.optional[id] = ''
          }
          
          return {
            id: id,
            type: 'optional',
            title: titleMatch ? titleMatch[1] : '未知题目',
            options: [
              { label: 'A', content: optionAMatch ? optionAMatch[1] : '选项A' },
              { label: 'B', content: optionBMatch ? optionBMatch[1] : '选项B' },
              { label: 'C', content: optionCMatch ? optionCMatch[1] : '选项C' },
              { label: 'D', content: optionDMatch ? optionDMatch[1] : '选项D' }
            ],
            points: points
          }
        } catch (error) {
          console.error('解析选择题出错:', error, questionStr)
          return null
        }
      }).filter(q => q !== null)
    }
    
    // 处理填空题
    if (examData.blankList) {
      const blankList = Object.entries(examData.blankList || {})
      console.log('填空题数据:', blankList)
      
      exam.blankQuestions = blankList.map(([questionStr, points]) => {
        try {
          console.log('处理填空题字符串:', questionStr)
          
          // 解析填空题
          const idMatch = questionStr.match(/id=(\d+)/)
          const titleMatch = questionStr.match(/title=([^,]+)/)
          
          // 初始化填空题答案
          const id = idMatch ? idMatch[1] : null
          if (id) {
            answers.value.blank[id] = ''
          }
          
          return {
            id: id,
            type: 'blank',
            title: titleMatch ? titleMatch[1] : '未知题目',
            points: points
          }
        } catch (error) {
          console.error('解析填空题出错:', error, questionStr)
          return null
        }
      }).filter(q => q !== null)
    }
    
    // 处理判断题 - 注意后端键名是 judgmentList 而不是 judgementList
    if (examData.judgmentList) { // 使用后端的键名
      const judgmentList = Object.entries(examData.judgmentList || {})
      console.log('判断题数据:', judgmentList)
      
      exam.judgementQuestions = judgmentList.map(([questionStr, points]) => {
        try {
          console.log('处理判断题字符串:', questionStr)
          
          // 解析判断题
          const idMatch = questionStr.match(/id=(\d+)/)
          const titleMatch = questionStr.match(/title=([^,]+)/)
          
          // 初始化判断题答案
          const id = idMatch ? idMatch[1] : null
          if (id) {
            answers.value.judgement[id] = null // true/false/null
          }
          
          return {
            id: id,
            type: 'judgement',
            title: titleMatch ? titleMatch[1] : '未知题目',
            points: points
          }
        } catch (error) {
          console.error('解析判断题出错:', error, questionStr)
          return null
        }
      }).filter(q => q !== null)
    }
    
    // 计算题目总数
    exam.questionCount = 
      exam.programQuestions.length + 
      exam.optionalQuestions.length +
      exam.blankQuestions.length +
      exam.judgementQuestions.length
    
    // 开始计时器
    if (remainingTime.value > 0) {
      startTimer()
    } else {
      ElMessage.warning('考试已结束')
    }
    
  } catch (error) {
    console.error('解析考试数据出错:', error)
    ElMessage.error('解析考试数据出错，请返回考试列表重新进入')
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  // 清除计时器
  clearInterval(timer.value)
})

// 启动计时器
const startTimer = () => {
  timer.value = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      clearInterval(timer.value)
      handleSubmitExam() // 时间到自动提交
    }
  }, 1000)
}

// 格式化时间显示
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':')
}

// 计算答题进度
const calculateProgress = computed(() => {
  let answeredCount = 0
  let totalCount = 0
  
  // 统计编程题答题情况
  Object.values(answers.value.program).forEach(answer => {
    if (answer && answer.trim() !== '') answeredCount++
  })
  totalCount += Object.keys(answers.value.program).length
  
  // 统计选择题答题情况
  Object.values(answers.value.optional).forEach(answer => {
    if (answer !== '') answeredCount++
  })
  totalCount += Object.keys(answers.value.optional).length
  
  // 统计填空题答题情况
  Object.values(answers.value.blank).forEach(answer => {
    if (answer && answer.trim() !== '') answeredCount++
  })
  totalCount += Object.keys(answers.value.blank).length
  
  // 统计判断题答题情况
  Object.values(answers.value.judgement).forEach(answer => {
    if (answer !== null) answeredCount++
  })
  totalCount += Object.keys(answers.value.judgement).length
  
  return totalCount > 0 ? Math.floor((answeredCount / totalCount) * 100) : 0
})

// 提交考试
const handleSubmitExam = async () => {
  submitting.value = true
  
  try {
    // 分别提交填空题和编程题
    const blankSubmissions = Object.entries(answers.value.blank).map(([questionId, answer]) => ({
      questionId: parseInt(questionId),
      answer: answer,
      examId: parseInt(exam.id)
    }));
    
    const programSubmissions = Object.entries(answers.value.program).map(([questionId, code]) => ({
      questionId: parseInt(questionId),
      code: code,
      examId: parseInt(exam.id)
    }));
    
    // 提交填空题
    if (blankSubmissions.length > 0) {
      ElMessage({
        message: '提交填空题...',
        type: 'info',
        duration: 1000
      });
      
      for (const submission of blankSubmissions) {
        try {
          console.log(`提交填空题: ID=${submission.questionId}, 答案=${submission.answer}`);
          const response = await request.post('/blank/submit/do', submission);
          
          if (response.code === 0) {
            console.log(`填空题 ${submission.questionId} 提交成功`);
          } else {
            console.error(`填空题 ${submission.questionId} 提交失败: ${response.message}`);
          }
          
          // 每次提交后等待500毫秒
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`填空题 ${submission.questionId} 提交出错:`, error);
        }
      }
    }
    
    // 提交编程题
    if (programSubmissions.length > 0) {
      ElMessage({
        message: '提交编程题...',
        type: 'info',
        duration: 1000
      });
      
      for (const submission of programSubmissions) {
        try {
          console.log(`提交编程题: ID=${submission.questionId}, 代码长度=${submission.code.length}`);
          const response = await request.post('/program/submit/do', submission);
          
          if (response.code === 0) {
            console.log(`编程题 ${submission.questionId} 提交成功`);
          } else {
            console.error(`编程题 ${submission.questionId} 提交失败: ${response.message}`);
          }
          
          // 每次提交后等待500毫秒
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`编程题 ${submission.questionId} 提交出错:`, error);
        }
      }
    }
    
    // 所有题目提交完成
    ElMessage.success('所有答案提交成功');
    
    // 清除localStorage中的考试数据
    localStorage.removeItem('currentExamData');
    
    // 跳转到成绩页面
    setTimeout(() => {
      router.push('/student/scores');
    }, 1500);
    
  } catch (error) {
    console.error('提交考试出错:', error);
    ElMessage.error('提交失败，请重试');
  } finally {
    submitting.value = false;
  }
}

// 合并所有题目列表以便于渲染
const allQuestions = computed(() => {
  return [
    ...exam.optionalQuestions.map(q => ({ ...q, typeText: '选择题' })),
    ...exam.programQuestions.map(q => ({ ...q, typeText: '编程题' })),
    ...exam.blankQuestions.map(q => ({ ...q, typeText: '填空题' })),
    ...exam.judgementQuestions.map(q => ({ ...q, typeText: '判断题' }))
  ]
})
</script>

<template>
  <div class="take-exam-container" v-loading="loading">
    <div class="exam-header" v-if="!loading">
      <div class="exam-title">
        <h2>{{ exam.id ? `考试ID: ${exam.id}` : '考试' }}</h2>
        <div class="exam-info">
          <span>总分: {{ exam.totalPoints }}分</span>
          <span>题目数量: {{ exam.questionCount }}</span>
          <span>考试时长: {{ exam.duration }}分钟</span>
        </div>
      </div>
      
      <div class="exam-timer">
        <el-tag type="danger" size="large">
          <i class="el-icon-time"></i>
          剩余时间: {{ formatTime(remainingTime) }}
        </el-tag>
      </div>
    </div>
    
    <el-divider></el-divider>
    
    <div class="exam-content" v-if="!loading">
      <el-progress 
        :percentage="calculateProgress" 
        :format="(percentage) => `已完成 ${percentage}%`"
        status="success"
        style="margin-bottom: 20px"
      ></el-progress>
      
      <div class="questions-container">
        <!-- 选择题 -->
        <div v-if="exam.optionalQuestions.length > 0" class="question-section">
          <h2 class="section-title">一、选择题</h2>
          <div v-for="(question, index) in exam.optionalQuestions" :key="`optional-${question.id}`" class="question-item">
            <h3>{{ index + 1 }}. {{ question.title }} <span class="question-points">({{ question.points }}分)</span></h3>
            
            <div class="option-group">
              <div v-for="option in question.options" :key="option.label" class="option-item">
                <el-radio 
                  v-model="answers.optional[question.id]" 
                  :label="option.label"
                  @change="() => handleOptionalAnswer(question.id, option.label)"
                >
                  {{ option.label }}. {{ option.content }}
                </el-radio>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 判断题 -->
        <div v-if="exam.judgementQuestions.length > 0" class="question-section">
          <h2 class="section-title">二、判断题</h2>
          <div v-for="(question, index) in exam.judgementQuestions" :key="`judgement-${question.id}`" class="question-item">
            <h3>{{ index + 1 }}. {{ question.title }} <span class="question-points">({{ question.points }}分)</span></h3>
            
            <div class="judgement-options">
              <el-radio 
                v-model="answers.judgement[question.id]" 
                :label="true"
                @change="() => handleJudgementAnswer(question.id, true)"
              >
                正确
              </el-radio>
              <el-radio 
                v-model="answers.judgement[question.id]" 
                :label="false"
                @change="() => handleJudgementAnswer(question.id, false)"
              >
                错误
              </el-radio>
            </div>
          </div>
        </div>
        
        <!-- 填空题 -->
        <div v-if="exam.blankQuestions.length > 0" class="question-section">
          <h2 class="section-title">三、填空题</h2>
          <div v-for="(question, index) in exam.blankQuestions" :key="`blank-${question.id}`" class="question-item">
            <h3>{{ index + 1 }}. {{ question.title }} <span class="question-points">({{ question.points }}分)</span></h3>
            
            <el-input
              v-model="answers.blank[question.id]"
              placeholder="请输入答案"
            ></el-input>
          </div>
        </div>
        
        <!-- 编程题 -->
        <div v-if="exam.programQuestions.length > 0" class="question-section">
          <h2 class="section-title">四、编程题</h2>
          <div v-for="(question, index) in exam.programQuestions" :key="`program-${question.id}`" class="question-item">
            <h3>{{ index + 1 }}. {{ question.title }} <span class="question-points">({{ question.points }}分)</span></h3>
            
            <div class="question-tags" v-if="question.tags.length > 0">
              <el-tag 
                v-for="tag in question.tags" 
                :key="tag" 
                size="small" 
                class="question-tag"
              >
                {{ tag }}
              </el-tag>
            </div>
            
            <div v-if="question.content" class="question-content">
              {{ question.content }}
            </div>
            
            <el-input
              v-model="answers.program[question.id]"
              type="textarea"
              :rows="10"
              placeholder="请在此编写您的代码..."
            ></el-input>
          </div>
        </div>
      </div>
      
      <div class="exam-actions">
        <el-button type="primary" @click="handleSubmitExam" :loading="submitting" size="large">
          提交答卷
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.take-exam-container {
  padding: 20px;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exam-info {
  display: flex;
  margin-top: 10px;
}

.exam-info span {
  margin-right: 20px;
  color: #666;
}

.exam-timer {
  display: flex;
  align-items: center;
}

.section-title {
  margin: 30px 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.questions-container {
  margin-bottom: 30px;
}

.question-item {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.question-points {
  color: #F56C6C;
  font-size: 0.9em;
}

.question-tags {
  margin: 10px 0;
}

.question-tag {
  margin-right: 5px;
}

.question-content {
  margin: 15px 0;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  white-space: pre-wrap;
}

.option-item {
  margin: 10px 0;
}

.exam-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style> 