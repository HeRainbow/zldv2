<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const examId = route.params.id
const loading = ref(false)
const examData = ref({})
const questionList = ref([])
const classMap = ref({}) // 班级ID到班级名称的映射

// 题目类型统计
const questionStats = reactive({
  totalCount: 0,
  singleCount: 0,
  fillCount: 0,
  judgeCount: 0,
  programCount: 0,
  totalPoints: 0
})

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

// 获取考试详情
const fetchExamDetail = async () => {
  if (!examId) {
    ElMessage.error('考试ID不能为空')
    router.push('/teacher/exam-list')
    return
  }
  
  loading.value = true
  try {
    // 获取考试详情
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
      
      // 计算考试时长（分钟）
      const startTime = new Date(exam.startTime)
      const endTime = new Date(exam.endTime)
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60))
      
      // 格式化时间
      const formatTime = (timeStr) => {
        const date = new Date(timeStr)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }
      
      // 计算考试状态
      const now = new Date()
      let status = 'upcoming'
      if (now > endTime) {
        status = 'completed'
      } else if (now >= startTime && now <= endTime) {
        status = 'ongoing'
      }
      
      // 处理考试数据
      examData.value = {
        id: exam.id,
        title: exam.name,
        classId: exam.classId,
        className: classMap.value[exam.classId] || `班级(${exam.classId})`,
        startTime: formatTime(exam.startTime),
        endTime: formatTime(exam.endTime),
        duration: durationMinutes,
        createTime: formatTime(exam.createTime),
        status: status,
        optionalScore: exam.optionalScore || {},
        blankScore: exam.blankScore || {},
        judgementScore: exam.judgementScore || {},
        programScore: exam.programScore || {}
      }
      
      // 获取考试题目详情
      await fetchExamQuestions()
    } else {
      ElMessage.error('获取考试详情失败')
      router.push('/teacher/exam-list')
    }
  } catch (error) {
    console.error('获取考试详情失败', error)
    ElMessage.error('获取考试详情失败，请稍后重试')
    router.push('/teacher/exam-list')
  } finally {
    loading.value = false
  }
}

// 获取考试题目详情
const fetchExamQuestions = async () => {
  try {
    const res = await request({
      url: '/exam/get/question/teacher',
      method: 'post',
      data: {
        id: examId
      }
    })
    
    if (res.code === 0 && res.data) {
      const questionData = res.data
      
      // 处理单选题
      if (questionData.optionalList) {
        const optionalQuestions = processDetailedQuestions(questionData.optionalList, 'single')
        questionList.value.push(...optionalQuestions)
        questionStats.singleCount = optionalQuestions.length
      }
      
      // 处理判断题
      if (questionData.judgmentList) {
        const judgmentQuestions = processDetailedQuestions(questionData.judgmentList, 'judge')
        questionList.value.push(...judgmentQuestions)
        questionStats.judgeCount = judgmentQuestions.length
      }
      
      // 处理填空题
      if (questionData.blankList) {
        const blankQuestions = processDetailedQuestions(questionData.blankList, 'fill')
        questionList.value.push(...blankQuestions)
        questionStats.fillCount = blankQuestions.length
      }
      
      // 处理编程题
      if (questionData.programList) {
        const programQuestions = processDetailedQuestions(questionData.programList, 'program')
        questionList.value.push(...programQuestions)
        questionStats.programCount = programQuestions.length
      }
      
      // 更新题目统计
      questionStats.totalCount = questionList.value.length
      questionStats.totalPoints = questionList.value.reduce((sum, q) => sum + Number(q.points), 0)
    } else {
      ElMessage.error('获取考试题目失败')
    }
  } catch (error) {
    console.error('获取考试题目失败', error)
    ElMessage.error('获取考试题目失败，请稍后重试')
  }
}

// 处理详细的题目信息
const processDetailedQuestions = (questionList, type) => {
  if (!questionList) return []
  
  const result = []
  
  // 记录调试信息
  console.log(`处理${type}类型题目:`, questionList);
  
  for (const [questionStr, points] of Object.entries(questionList)) {
    try {
      // 解析题目字符串
      let questionObj = extractQuestionInfo(questionStr, type)
      
      if (!questionObj) {
        console.warn(`提取题目信息失败: ${questionStr}`);
        continue;
      }
      
      // 添加分数
      questionObj.points = points
      
      // 根据题目类型处理特定字段
      switch (type) {
        case 'single':
          questionObj.options = [
            { label: 'A', content: questionObj.optionA || '' },
            { label: 'B', content: questionObj.optionB || '' },
            { label: 'C', content: questionObj.optionC || '' },
            { label: 'D', content: questionObj.optionD || '' }
          ]
          break
        case 'judge':
          questionObj.answer = questionObj.answer === 1 || questionObj.answer === '1' ? '正确' : '错误'
          break
        case 'program':
          // 处理judgeCase（可能是字符串或对象）
          if (typeof questionObj.judgeCase === 'string') {
            try {
              questionObj.judgeCase = JSON.parse(questionObj.judgeCase)
            } catch (e) {
              console.error('解析judgeCase失败:', e)
            }
          }
          break
      }
      
      result.push(questionObj)
    } catch (error) {
      console.error('处理题目信息失败:', error, questionStr)
    }
  }
  
  return result
}

// 从字符串中提取题目信息
const extractQuestionInfo = (questionStr, type) => {
  try {
    // 输出原始字符串，帮助调试
    console.log(`解析${type}题目字符串:`, questionStr);

    // 识别题目类型
    let typePattern = null
    switch (type) {
      case 'single':
        typePattern = /(OptionalVO|Optional)\(([^)]+)\)/
        break
      case 'judge':
        typePattern = /(JudgmentVO|Judgment)\(([^)]+)\)/
        break
      case 'fill':
        typePattern = /(BlanksVO|Blanks|Blank)\(([^)]+)\)/
        break
      case 'program':
        typePattern = /(ProgramQuestionVO|Program)\(([^)]+)\)/
        break
    }
    
    if (!typePattern) return null
    
    // 提取主体内容
    const matches = questionStr.match(typePattern)
    if (!matches || !matches[2]) {
      console.warn(`正则表达式未匹配: ${questionStr}, 模式: ${typePattern}`);
      return null;
    }
    
    const paramsStr = matches[2]
    
    // 解析各个参数
    const result = {
      type: type,
      id: extractParam(paramsStr, 'id='),
      content: extractParam(paramsStr, 'title='),
      answer: extractParam(paramsStr, 'answer=')
    }
    
    // 根据题目类型提取特定字段
    if (type === 'single') {
      result.optionA = extractParam(paramsStr, 'optionA=')
      result.optionB = extractParam(paramsStr, 'optionB=')
      result.optionC = extractParam(paramsStr, 'optionC=')
      result.optionD = extractParam(paramsStr, 'optionD=')
    } else if (type === 'program') {
      result.defaultProgram = extractParam(paramsStr, 'defaultProgram=')
      result.judgeCase = extractParam(paramsStr, 'judgeCase=')
      result.judgeConfig = extractParam(paramsStr, 'judgeConfig=')
    }
    
    return result
  } catch (error) {
    console.error('提取题目信息失败:', error)
    return null
  }
}

// 从参数字符串中提取值
const extractParam = (str, paramPrefix) => {
  const startIdx = str.indexOf(paramPrefix)
  if (startIdx === -1) return null
  
  // 找到参数的结束位置（下一个逗号或字符串结束）
  // 但要处理逗号在引号内的情况
  let endIdx = -1
  let inQuotes = false
  let i = startIdx + paramPrefix.length
  
  while (i < str.length) {
    // 处理引号
    if (str[i] === '"' && (i === 0 || str[i-1] !== '\\')) {
      inQuotes = !inQuotes
    }
    
    // 如果找到逗号且不在引号内，这是参数的结束
    if (str[i] === ',' && !inQuotes) {
      endIdx = i
      break
    }
    
    i++
  }
  
  // 如果没有找到结束逗号，则使用字符串结束
  if (endIdx === -1) endIdx = str.length
  
  let value = str.substring(startIdx + paramPrefix.length, endIdx).trim()
  
  // 移除可能的引号
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.substring(1, value.length - 1)
  } else if (value === 'null') {
    value = null
  }
  
  return value
}

// 获取状态文本
const getStatusText = (status) => {
  if (status === 'upcoming') return '即将开始'
  if (status === 'ongoing') return '进行中'
  return '已结束'
}

// 获取状态类型
const getStatusType = (status) => {
  if (status === 'upcoming') return 'primary'
  if (status === 'ongoing') return 'success'
  return 'info'
}

// 获取题目类型文本
const getTypeText = (type) => {
  const typeMap = {
    'single': '单选题',
    'fill': '填空题',
    'judge': '判断题',
    'program': '编程题'
  }
  return typeMap[type] || type
}

// 返回考试列表
const handleGoBack = () => {
  router.push('/teacher/exam-list')
}

// 编辑考试
const handleEditExam = () => {
  router.push(`/teacher/edit-exam/${examId}`)
}

onMounted(async () => {
  // 获取班级列表
  await fetchClassList()
  
  // 获取考试详情
  await fetchExamDetail()
})
</script>

<template>
  <div class="exam-detail-container">
    <div class="page-header">
      <h2>考试详情</h2>
      <div class="header-actions">
        <el-button @click="handleGoBack">返回列表</el-button>
        <el-button 
          v-if="examData.status === 'upcoming'" 
          type="primary" 
          @click="handleEditExam"
        >
          编辑考试
        </el-button>
      </div>
    </div>
    
    <el-card class="exam-info-card" v-loading="loading">
      <div class="exam-basic-info">
        <h3>{{ examData.title }}</h3>
        <div class="status-tag">
          <el-tag :type="getStatusType(examData.status)">
            {{ getStatusText(examData.status) }}
          </el-tag>
        </div>
      </div>
      
      <div class="exam-meta-info">
        <div class="info-item">
          <span class="label">班级：</span>
          <span class="value">
            <el-tag size="small">{{ examData.className }}</el-tag>
          </span>
        </div>
        <div class="info-item">
          <span class="label">开始时间：</span>
          <span class="value">{{ examData.startTime }}</span>
        </div>
        <div class="info-item">
          <span class="label">结束时间：</span>
          <span class="value">{{ examData.endTime }}</span>
        </div>
        <div class="info-item">
          <span class="label">考试时长：</span>
          <span class="value">{{ examData.duration }} 分钟</span>
        </div>
        <div class="info-item">
          <span class="label">创建时间：</span>
          <span class="value">{{ examData.createTime }}</span>
        </div>
      </div>
      
      <el-divider content-position="left">题目统计</el-divider>
      
      <div class="exam-stats">
        <div class="stats-row">
          <div class="stats-item">
            <div class="stats-label">总题目数</div>
            <div class="stats-value">{{ questionStats.totalCount }}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">单选题</div>
            <div class="stats-value">{{ questionStats.singleCount }}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">填空题</div>
            <div class="stats-value">{{ questionStats.fillCount }}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">判断题</div>
            <div class="stats-value">{{ questionStats.judgeCount }}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">编程题</div>
            <div class="stats-value">{{ questionStats.programCount }}</div>
          </div>
          <div class="stats-item">
            <div class="stats-label">总分值</div>
            <div class="stats-value">{{ questionStats.totalPoints }}</div>
          </div>
        </div>
      </div>
      
      <el-divider content-position="left">考试题目</el-divider>
      
      <div class="question-section">
        <el-empty v-if="questionList.length === 0" description="暂无题目"></el-empty>
        
        <div v-else class="question-list">
          <div v-for="(question, index) in questionList" :key="question.id" class="question-item">
            <div class="question-header">
              <div class="question-info">
                <span class="question-index">{{ index + 1 }}.</span>
                <el-tag 
                  :type="
                    question.type === 'single' ? 'primary' : 
                    question.type === 'fill' ? 'success' : 
                    question.type === 'judge' ? 'warning' : 
                    question.type === 'program' ? 'danger' : 'info'
                  "
                  size="small"
                >
                  {{ getTypeText(question.type) }}
                </el-tag>
                <span class="question-points">{{ question.points }} 分</span>
              </div>
            </div>
            <div class="question-content">{{ question.content }}</div>
            
            <!-- 显示题目选项（单选题） -->
            <div v-if="question.type === 'single'" class="question-options">
              <div v-for="option in question.options" :key="option.label" class="option-item">
                <span class="option-label">{{ option.label }}</span>
                <span class="option-content">{{ option.content }}</span>
              </div>
              <div class="question-answer">
                <strong>正确答案：</strong>
                <span>{{ question.answer }}</span>
              </div>
            </div>
            
            <!-- 显示填空题答案 -->
            <div v-if="question.type === 'fill'" class="question-answer">
              <strong>填空答案：</strong>
              <span>{{ question.answer }}</span>
            </div>
            
            <!-- 显示判断题答案 -->
            <div v-if="question.type === 'judge'" class="question-answer">
              <strong>正确答案：</strong>
              <span>{{ question.answer }}</span>
            </div>
            
            <!-- 显示编程题信息 -->
            <div v-if="question.type === 'program'" class="question-programming">
              <div v-if="question.defaultProgram" class="question-default-program">
                <strong>初始代码：</strong>
                <pre>{{ question.defaultProgram }}</pre>
              </div>
              <div class="question-answer">
                <strong>参考答案：</strong>
                <pre>{{ question.answer }}</pre>
              </div>
              <div v-if="question.judgeCase" class="question-judge-case">
                <strong>测试用例：</strong>
                <pre>{{ typeof question.judgeCase === 'object' ? JSON.stringify(question.judgeCase, null, 2) : question.judgeCase }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.exam-detail-container {
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
  width: 100%;
}

.exam-basic-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.exam-basic-info h3 {
  margin: 0;
  font-size: 20px;
}

.exam-meta-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
}

.label {
  font-weight: bold;
  margin-right: 5px;
  min-width: 80px;
}

.exam-stats {
  margin-bottom: 20px;
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.stats-item {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px 15px;
  min-width: 120px;
  text-align: center;
}

.stats-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 5px;
}

.stats-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}

/* 题目列表样式 */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.question-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-index {
  font-weight: bold;
}

.question-points {
  color: #f56c6c;
  font-weight: bold;
}

.question-content {
  margin-bottom: 15px;
  font-size: 14px;
  line-height: 1.6;
}

.question-options {
  margin-top: 10px;
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
}

.option-item {
  display: flex;
  margin-bottom: 8px;
}

.option-label {
  width: 30px;
  font-weight: bold;
}

.question-answer {
  margin-top: 15px;
  padding: 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
  color: #67c23a;
}

.question-programming {
  margin-top: 15px;
}

.question-default-program pre, 
.question-answer pre,
.question-judge-case pre {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin: 5px 0;
  white-space: pre-wrap;
}

.question-answer pre {
  background-color: #f0f9eb;
}

.question-judge-case {
  margin-top: 15px;
}
</style> 