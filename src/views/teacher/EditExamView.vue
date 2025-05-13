<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const examId = route.params.id || route.query.id
const loading = ref(false)
const saveLoading = ref(false)
const formRef = ref(null)
const classList = ref([])
const loadingClasses = ref(true)
const selectedQuestions = ref([])
const questionDialogVisible = ref(false)
const searchText = ref('')
const selectedType = ref('all')
const loadingQuestions = ref(false)
const questions = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalQuestions = ref(0)

// 考试表单数据
const examForm = reactive({
  id: examId,
  title: '',
  classId: '',
  startTime: '',
  duration: 120,
  description: '',
  blankScore: {},
  judgementScore: {},
  optionalScore: {},
  programScore: {}
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入考试名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  classId: [
    { required: true, message: '请选择班级', trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择考试开始时间', trigger: 'change' }
  ],
  duration: [
    { required: true, message: '请填写考试时长', trigger: 'blur' },
    { type: 'number', min: 30, message: '考试时长不能少于30分钟', trigger: 'blur' }
  ]
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

// 获取班级列表
const fetchClassList = async () => {
  loadingClasses.value = true
  const userInfo = getUserInfo()
  
  if (!userInfo || !userInfo.id) {
    ElMessage.error('获取用户信息失败，请重新登录')
    router.push('/login')
    return
  }
  
  try {
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
      classList.value = res.data.records || []
    } else {
      ElMessage.error(res.message || '获取班级列表失败')
    }
  } catch (error) {
    console.error('获取班级列表出错', error)
    ElMessage.error('获取班级列表失败，请稍后重试')
  } finally {
    loadingClasses.value = false
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
      const examData = res.data.records[0]
      
      // 计算考试时长（分钟）
      const startTime = new Date(examData.startTime)
      const endTime = new Date(examData.endTime)
      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60))
      
      // 格式化时间为YYYY-MM-DDTHH:mm:ss格式
      const formatToLocalDateTime = (timeStr) => {
        const date = new Date(timeStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }
      
      // 填充表单数据
      examForm.id = examData.id
      examForm.title = examData.name
      examForm.classId = examData.classId
      examForm.startTime = formatToLocalDateTime(examData.startTime)
      examForm.duration = durationMinutes
      
      // 获取题目分数
      examForm.blankScore = examData.blankScore || {}
      examForm.judgementScore = examData.judgementScore || {}
      examForm.optionalScore = examData.optionalScore || {}
      examForm.programScore = examData.programScore || {}
      
      // 获取已选题目（如果需要，可以额外请求题目详情）
      await fetchSelectedQuestions()
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

// 获取已选题目（如果需要展示题目详情）
const fetchSelectedQuestions = async () => {
  selectedQuestions.value = []

  try {
    // 使用新接口获取详细的题目信息
    const res = await request({
      url: '/exam/get/question/teacher',
      method: 'post',
      data: {
        id: examId
      }
    })
    
    if (res.code === 0 && res.data) {
      // 处理题目数据
      const questionData = res.data
      
      // 处理选择题
      if (questionData.optionalList) {
        const optionalQuestions = processDetailedQuestions(questionData.optionalList, 'single')
        selectedQuestions.value.push(...optionalQuestions)
      }
      
      // 处理判断题
      if (questionData.judgmentList) {
        const judgmentQuestions = processDetailedQuestions(questionData.judgmentList, 'judge')
        selectedQuestions.value.push(...judgmentQuestions)
      }
      
      // 处理填空题
      if (questionData.blankList) {
        const blankQuestions = processDetailedQuestions(questionData.blankList, 'fill')
        selectedQuestions.value.push(...blankQuestions)
      }
      
      // 处理编程题
      if (questionData.programList) {
        const programQuestions = processDetailedQuestions(questionData.programList, 'program')
        selectedQuestions.value.push(...programQuestions)
      }
      
      // 更新考试表单中的分数信息
      updateScoreFormData(questionData)
      
      console.log("已获取到", selectedQuestions.value.length, "道题目")
      return // 如果新接口成功，直接返回
    } else {
      console.warn("新接口获取题目失败，尝试使用旧方法")
      // 如果新接口失败，使用原始方法获取题目信息
      await fetchQuestionsByTypes()
    }
  } catch (error) {
    console.error('获取题目详情失败', error)
    ElMessage.error('获取题目详情失败，请稍后重试')
    
    // 如果新接口失败，使用原始方法获取题目信息
    await fetchQuestionsByTypes()
  }
}

// 使用原始方法分类型获取题目详情
const fetchQuestionsByTypes = async () => {
  try {
    // 获取单选题详情
    await fetchQuestionsByType('single', Object.keys(examForm.optionalScore))
    
    // 获取填空题详情
    await fetchQuestionsByType('fill', Object.keys(examForm.blankScore))
    
    // 获取判断题详情
    await fetchQuestionsByType('judge', Object.keys(examForm.judgementScore))
    
    // 获取编程题详情
    await fetchQuestionsByType('program', Object.keys(examForm.programScore))
  } catch (error) {
    console.error('获取题目详情失败', error)
    ElMessage.error('获取题目详情失败，请稍后重试')
  }
}

// 处理详细的题目信息
const processDetailedQuestions = (questionList, type) => {
  if (!questionList) return []
  
  const result = []
  
  for (const [questionStr, points] of Object.entries(questionList)) {
    try {
      // 解析题目字符串
      let questionObj = extractQuestionInfo(questionStr, type)
      
      if (!questionObj) continue
      
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
      console.error('处理题目信息失败:', error)
    }
  }
  
  return result
}

// 从字符串中提取题目信息
const extractQuestionInfo = (questionStr, type) => {
  try {
    // 识别题目类型
    let typePattern = null
    switch (type) {
      case 'single':
        typePattern = /Optional\(([^)]+)\)/
        break
      case 'judge':
        typePattern = /Judgment\(([^)]+)\)/
        break
      case 'fill':
        typePattern = /Blank\(([^)]+)\)/
        break
      case 'program':
        typePattern = /Program\(([^)]+)\)/
        break
    }
    
    if (!typePattern) return null
    
    // 提取主体内容
    const matches = questionStr.match(typePattern)
    if (!matches || !matches[1]) return null
    
    const paramsStr = matches[1]
    
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
  
  let endIdx = str.indexOf(',', startIdx)
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

// 更新考试表单中的分数信息
const updateScoreFormData = (questionData) => {
  // 更新各个题型的分数
  if (questionData.optionalList) {
    Object.entries(questionData.optionalList).forEach(([questionStr, points]) => {
      const id = extractParam(questionStr, 'id=')
      if (id) {
        examForm.optionalScore[id] = points
      }
    })
  }
  
  if (questionData.judgmentList) {
    Object.entries(questionData.judgmentList).forEach(([questionStr, points]) => {
      const id = extractParam(questionStr, 'id=')
      if (id) {
        examForm.judgementScore[id] = points
      }
    })
  }
  
  if (questionData.blankList) {
    Object.entries(questionData.blankList).forEach(([questionStr, points]) => {
      const id = extractParam(questionStr, 'id=')
      if (id) {
        examForm.blankScore[id] = points
      }
    })
  }
  
  if (questionData.programList) {
    Object.entries(questionData.programList).forEach(([questionStr, points]) => {
      const id = extractParam(questionStr, 'id=')
      if (id) {
        examForm.programScore[id] = points
      }
    })
  }
}

// 根据题目类型和ID列表获取题目详情
const fetchQuestionsByType = async (type, idList) => {
  if (!idList || idList.length === 0) return;
  
  let url = '';
  
  // 根据题目类型选择不同的API接口
  switch(type) {
    case 'single':
      url = '/op/list/page';
      break;
    case 'fill':
      url = '/blank/list/page';
      break;
    case 'judge':
      url = '/judge/list/page';
      break;
    case 'program':
      url = '/program/list/page';
      break;
    default:
      return;
  }
  
  // 分批获取题目，每次最多获取20个
  const batchSize = 20;
  for (let i = 0; i < idList.length; i += batchSize) {
    const batchIds = idList.slice(i, i + batchSize);
    
    const res = await request({
      url,
      method: 'post',
      data: {
        ids: batchIds,
        current: 1,
        pageSize: batchSize
      }
    });
    
    if (res.code === 0 && res.data && res.data.records) {
      // 格式化题目数据并添加到已选题目列表
      const formattedQuestions = formatQuestions(res.data.records, type);
      selectedQuestions.value = [...selectedQuestions.value, ...formattedQuestions];
    }
  }
}

// 格式化题目数据
const formatQuestions = (questions, type) => {
  return questions.map(item => {
    // 获取当前题目的分值
    let points = 0;
    const questionId = item.id.toString();
    
    switch(type) {
      case 'single':
        points = examForm.optionalScore[questionId] || 0;
        return {
          id: item.id,
          type,
          content: item.title,
          options: [
            { label: 'A', content: item.optionA },
            { label: 'B', content: item.optionB },
            { label: 'C', content: item.optionC },
            { label: 'D', content: item.optionD }
          ],
          answer: item.answer,
          points
        };
      case 'fill':
        points = examForm.blankScore[questionId] || 0;
        return {
          id: item.id,
          type,
          content: item.title,
          answer: item.answer,
          points
        };
      case 'judge':
        points = examForm.judgementScore[questionId] || 0;
        return {
          id: item.id,
          type,
          content: item.title,
          answer: item.answer === 1 ? '正确' : '错误',
          answerValue: item.answer,
          points
        };
      case 'program':
        points = examForm.programScore[questionId] || 0;
        return {
          id: item.id,
          type,
          content: item.title,
          answer: item.answer,
          defaultProgram: item.defaultProgram,
          judgeCase: item.judgeCase,
          judgeConfig: item.judgeConfig,
          points
        };
      default:
        return item;
    }
  });
}

// 计算总分
const calculateTotalPoints = computed(() => {
  let totalPoints = 0
  
  // 计算单选题总分
  Object.values(examForm.optionalScore).forEach(score => {
    totalPoints += Number(score) || 0
  })
  
  // 计算填空题总分
  Object.values(examForm.blankScore).forEach(score => {
    totalPoints += Number(score) || 0
  })
  
  // 计算判断题总分
  Object.values(examForm.judgementScore).forEach(score => {
    totalPoints += Number(score) || 0
  })
  
  // 计算编程题总分
  Object.values(examForm.programScore).forEach(score => {
    totalPoints += Number(score) || 0
  })
  
  return totalPoints
})

// 过滤可选题目列表，排除已选择的题目
const filteredQuestions = computed(() => {
  let result = questions.value.filter(q => {
    // 检查题目是否已经被选择
    const qId = q.id.toString();
    
    switch(q.type) {
      case 'single':
        return !examForm.optionalScore[qId];
      case 'fill':
        return !examForm.blankScore[qId];
      case 'judge':
        return !examForm.judgementScore[qId];
      case 'program':
        return !examForm.programScore[qId];
      default:
        return true;
    }
  });
  
  // 按类型筛选
  if (selectedType.value !== 'all') {
    result = result.filter(q => q.type === selectedType.value);
  }
  
  // 按关键词搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase();
    result = result.filter(q => {
      return q.content.toLowerCase().includes(keyword);
    });
  }
  
  return result;
});

// 显示题目选择对话框
const handleShowQuestionDialog = () => {
  questionDialogVisible.value = true;
  // 重置页码并加载题目
  currentPage.value = 1;
  fetchQuestions();
};

// 添加题目
const handleAddQuestion = (question) => {
  const questionId = question.id.toString();
  
  // 根据题目类型，将题目添加到对应的分数对象中
  switch(question.type) {
    case 'single':
      examForm.optionalScore[questionId] = question.points;
      break;
    case 'fill':
      examForm.blankScore[questionId] = question.points;
      break;
    case 'judge':
      examForm.judgementScore[questionId] = question.points;
      break;
    case 'program':
      examForm.programScore[questionId] = question.points;
      break;
  }
  
  // 更新已选题目列表
  selectedQuestions.value.push(question);
  ElMessage.success('已添加题目');
};

// 移除题目
const handleRemoveQuestion = (question) => {
  const questionId = question.id.toString();
  
  // 根据题目类型，从对应的分数对象中删除
  switch(question.type) {
    case 'single':
      delete examForm.optionalScore[questionId];
      break;
    case 'fill':
      delete examForm.blankScore[questionId];
      break;
    case 'judge':
      delete examForm.judgementScore[questionId];
      break;
    case 'program':
      delete examForm.programScore[questionId];
      break;
  }
  
  // 从已选题目列表中移除
  const index = selectedQuestions.value.findIndex(q => q.id === question.id);
  if (index !== -1) {
    selectedQuestions.value.splice(index, 1);
  }
  
  ElMessage.success('已移除题目');
};

// 修改题目分数
const handleScoreChange = (question, newScore) => {
  const questionId = question.id.toString();
  
  // 更新对应分数对象中的分数
  switch(question.type) {
    case 'single':
      examForm.optionalScore[questionId] = newScore;
      break;
    case 'fill':
      examForm.blankScore[questionId] = newScore;
      break;
    case 'judge':
      examForm.judgementScore[questionId] = newScore;
      break;
    case 'program':
      examForm.programScore[questionId] = newScore;
      break;
  }
  
  // 更新已选题目列表中的分数
  const index = selectedQuestions.value.findIndex(q => q.id === question.id);
  if (index !== -1) {
    selectedQuestions.value[index].points = newScore;
  }
};

// 保存修改
const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      // 检查是否有选择题目
      const totalQuestions = 
        Object.keys(examForm.optionalScore).length + 
        Object.keys(examForm.blankScore).length + 
        Object.keys(examForm.judgementScore).length + 
        Object.keys(examForm.programScore).length;
      
      if (totalQuestions === 0) {
        ElMessage.warning('请至少添加一道题目');
        return;
      }
      
      saveLoading.value = true;
      
      try {
        // 计算考试结束时间
        const startTime = new Date(examForm.startTime);
        const endTime = new Date(startTime.getTime() + examForm.duration * 60 * 1000);
        
        // 格式化为Java LocalDateTime格式 (yyyy-MM-ddTHH:mm:ss)
        const formatToLocalDateTime = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        }
        
        const startTimeFormatted = formatToLocalDateTime(startTime);
        const endTimeFormatted = formatToLocalDateTime(endTime);
        
        // 构建更新数据
        const updateData = {
          id: Number(examForm.id),
          examName: examForm.title,
          classId: examForm.classId,
          startTime: startTimeFormatted,
          endTime: endTimeFormatted,
          blankScore: examForm.blankScore,
          judgementScore: examForm.judgementScore,
          optionalScore: examForm.optionalScore,
          programScore: examForm.programScore,
          allScore: calculateTotalPoints.value  // 添加总分值
        }
        
        // 调用更新接口
        const res = await request({
          url: '/exam/update',
          method: 'post',
          data: updateData
        })
        
        if (res.code === 0) {
          ElMessage.success('考试更新成功');
          router.push('/teacher/exam-list');
        } else {
          ElMessage.error(res.message || '更新失败');
        }
      } catch (error) {
        console.error('更新考试失败', error);
        ElMessage.error('更新考试失败: ' + (error.message || '未知错误'));
      } finally {
        saveLoading.value = false;
      }
    }
  })
}

// 取消编辑
const handleCancel = () => {
  router.push('/teacher/exam-list')
}

// 获取题目列表
const fetchQuestions = async () => {
  loadingQuestions.value = true
  
  try {
    // 根据选择的题型获取不同题目
    let res
    let formattedQuestions = []
    
    // 获取单选题
    if (selectedType.value === 'all' || selectedType.value === 'single') {
      res = await request({
        url: '/op/list/page',
        method: 'post',
        data: {
          current: currentPage.value,
          pageSize: pageSize.value,
          sortField: "",
          sortOrder: ""
        }
      })
      
      if (res.code === 0 && res.data) {
        // 将后端返回的选择题数据格式化为组件使用的格式
        const singleQuestions = (res.data.records || []).map(item => {
          return {
            id: item.id,
            type: 'single',
            content: item.title,
            options: [
              { label: 'A', content: item.optionA },
              { label: 'B', content: item.optionB },
              { label: 'C', content: item.optionC },
              { label: 'D', content: item.optionD }
            ],
            answer: item.answer,
            points: 5 // 默认分值
          }
        })
        
        formattedQuestions = [...formattedQuestions, ...singleQuestions]
        totalQuestions.value = parseInt(res.data.total) || 0
      }
    }
    
    // 获取填空题
    if (selectedType.value === 'all' || selectedType.value === 'fill') {
      res = await request({
        url: '/blank/list/page',
        method: 'post',
        data: {
          current: currentPage.value,
          pageSize: pageSize.value
        }
      })
      
      if (res.code === 0 && res.data) {
        const fillQuestions = (res.data.records || []).map(item => {
          return {
            id: item.id,
            type: 'fill',
            content: item.title,
            answer: item.answer,
            points: 5 // 默认分值
          }
        })
        
        formattedQuestions = [...formattedQuestions, ...fillQuestions]
        if (selectedType.value === 'fill') {
          totalQuestions.value = parseInt(res.data.total) || 0
        }
      }
    }
    
    // 获取判断题
    if (selectedType.value === 'all' || selectedType.value === 'judge') {
      res = await request({
        url: '/judge/list/page',
        method: 'post',
        data: {
          current: currentPage.value,
          pageSize: pageSize.value
        }
      })
      
      if (res.code === 0 && res.data) {
        const judgeQuestions = (res.data.records || []).map(item => {
          return {
            id: item.id,
            type: 'judge',
            content: item.title,
            // 判断题答案：1表示"正确"，0表示"错误"
            answer: item.answer === 1 ? '正确' : '错误',
            answerValue: item.answer,
            points: 5 // 默认分值
          }
        })
        
        formattedQuestions = [...formattedQuestions, ...judgeQuestions]
        if (selectedType.value === 'judge') {
          totalQuestions.value = parseInt(res.data.total) || 0
        }
      }
    }
    
    // 获取编程题
    if (selectedType.value === 'all' || selectedType.value === 'program') {
      res = await request({
        url: '/program/list/page',
        method: 'post',
        data: {
          current: currentPage.value,
          pageSize: pageSize.value
        }
      })
      
      if (res.code === 0 && res.data) {
        const programQuestions = (res.data.records || []).map(item => {
          return {
            id: item.id,
            type: 'program',
            content: item.title,
            answer: item.answer,
            defaultProgram: item.defaultProgram,
            judgeCase: item.judgeCase,
            judgeConfig: item.judgeConfig,
            points: 10 // 编程题默认分值更高
          }
        })
        
        formattedQuestions = [...formattedQuestions, ...programQuestions]
        if (selectedType.value === 'program') {
          totalQuestions.value = parseInt(res.data.total) || 0
        }
      }
    }
    
    questions.value = formattedQuestions
    
    // 如果是"全部"类型，总数可能不准确，但这里仅用于分页展示
    if (selectedType.value === 'all') {
      totalQuestions.value = formattedQuestions.length
    }
  } catch (error) {
    console.error('获取题目列表出错', error)
    ElMessage.error('获取题目列表失败，请稍后重试')
  } finally {
    loadingQuestions.value = false
  }
}

// 页码变化
const handleQuestionPageChange = (page) => {
  currentPage.value = page
  fetchQuestions()
}

// 每页条数变化
const handleQuestionSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchQuestions()
}

const typeFilters = [
  { value: 'all', label: '全部类型' },
  { value: 'single', label: '单选题' },
  { value: 'fill', label: '填空题' },
  { value: 'judge', label: '判断题' },
  { value: 'program', label: '编程题' }
]

const getTypeText = (type) => {
  const typeMap = {
    'single': '单选题',
    'fill': '填空题',
    'judge': '判断题',
    'program': '编程题'
  }
  return typeMap[type] || type
}

onMounted(async () => {
  // 获取班级列表
  await fetchClassList();
  
  // 获取考试详情
  await fetchExamDetail();
  
  // 预加载题库中的题目
  await fetchQuestions();
})
</script>

<template>
  <div class="edit-exam-container">
    <div class="page-header">
      <h2>编辑考试</h2>
    </div>
    
    <el-card class="exam-form-card" v-loading="loading">
      <el-form
        ref="formRef"
        :model="examForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="考试名称" prop="title">
          <el-input v-model="examForm.title" placeholder="请输入考试名称"></el-input>
        </el-form-item>
        
        <el-form-item label="选择班级" prop="classId" v-loading="loadingClasses">
          <el-select 
            v-model="examForm.classId" 
            placeholder="请选择班级"
            style="width: 100%"
          >
            <el-option
              v-for="item in classList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-model="examForm.startTime"
            type="datetime"
            placeholder="选择考试开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          ></el-date-picker>
        </el-form-item>
        
        <el-form-item label="考试时长" prop="duration">
          <el-input-number
            v-model="examForm.duration"
            :min="30"
            :max="300"
            :step="10"
            controls-position="right"
          ></el-input-number>
          <span style="margin-left: 10px">分钟</span>
        </el-form-item>
        
        <el-divider>考试题目</el-divider>
        
        <div class="question-section">
          <div class="section-header">
            <div class="section-title">
              已选择 {{ 
                Object.keys(examForm.optionalScore).length + 
                Object.keys(examForm.blankScore).length + 
                Object.keys(examForm.judgementScore).length + 
                Object.keys(examForm.programScore).length 
              }} 道题目 / 总分值: {{ calculateTotalPoints }} 分
            </div>
            <el-button type="primary" @click="handleShowQuestionDialog">添加题目</el-button>
          </div>
          
          <el-empty v-if="selectedQuestions.length === 0" description="暂无题目，请添加"></el-empty>
          
          <div v-else class="question-list">
            <div v-for="(question, index) in selectedQuestions" :key="question.id" class="question-item">
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
                </div>
                <div class="question-actions">
                  <el-input-number
                    v-model="question.points"
                    :min="1"
                    :max="100"
                    :step="1"
                    size="small"
                    style="width: 100px; margin-right: 10px;"
                    @change="(val) => handleScoreChange(question, val)"
                  ></el-input-number>
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="handleRemoveQuestion(question)"
                  >删除</el-button>
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
                  <strong>参考答案(部分)：</strong>
                  <pre>{{ question.answer ? question.answer.substring(0, 100) + (question.answer.length > 100 ? '...' : '') : '' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="saveLoading">保存修改</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 题目选择对话框 -->
    <el-dialog
      v-model="questionDialogVisible"
      title="选择题目"
      width="70%"
    >
      <div class="question-dialog-content">
        <div class="dialog-toolbar">
          <div class="filter-section">
            <el-select v-model="selectedType" placeholder="题目类型" style="width: 120px; margin-right: 10px;">
              <el-option
                v-for="item in typeFilters"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              ></el-option>
            </el-select>
            <el-input
              v-model="searchText"
              placeholder="搜索题目内容"
              clearable
              style="width: 300px"
            ></el-input>
          </div>
        </div>
        
        <div class="dialog-question-list" v-loading="loadingQuestions">
          <div v-for="question in filteredQuestions" :key="question.id" class="dialog-question-item">
            <div class="dialog-question-header">
              <div class="dialog-question-type">
                <el-tag :type="
                  question.type === 'single' ? 'primary' : 
                  question.type === 'fill' ? 'success' : 
                  question.type === 'judge' ? 'warning' : 
                  question.type === 'program' ? 'danger' : 'info'
                ">
                  {{ getTypeText(question.type) }}
                </el-tag>
              </div>
              <el-button type="primary" size="small" @click="handleAddQuestion(question)">添加</el-button>
            </div>
            
            <div class="dialog-question-content">{{ question.content }}</div>
            
            <!-- 单选题选项 -->
            <div v-if="question.type === 'single'" class="dialog-question-options">
              <div v-for="option in question.options" :key="option.label" class="dialog-option-item">
                <span class="dialog-option-label">{{ option.label }}</span>
                <span class="dialog-option-content">{{ option.content }}</span>
              </div>
              <div class="dialog-question-answer">
                <strong>正确答案：</strong>
                <span>{{ question.answer }}</span>
              </div>
            </div>
            
            <!-- 填空题答案 -->
            <div v-if="question.type === 'fill'" class="dialog-question-answer">
              <strong>填空答案：</strong>
              <span>{{ question.answer }}</span>
            </div>
            
            <!-- 判断题答案 -->
            <div v-if="question.type === 'judge'" class="dialog-question-answer">
              <strong>正确答案：</strong>
              <span>{{ question.answer }}</span>
            </div>
            
            <!-- 编程题信息 -->
            <div v-if="question.type === 'program'" class="dialog-question-programming">
              <div v-if="question.defaultProgram" class="dialog-question-default-program">
                <strong>初始代码：</strong>
                <pre>{{ question.defaultProgram }}</pre>
              </div>
              <div class="dialog-question-answer">
                <strong>参考答案(部分)：</strong>
                <pre>{{ question.answer ? question.answer.substring(0, 100) + (question.answer.length > 100 ? '...' : '') : '' }}</pre>
              </div>
            </div>
          </div>
          
          <el-empty v-if="filteredQuestions.length === 0 && !loadingQuestions" description="暂无符合条件的题目"></el-empty>
        </div>
        
        <!-- 分页器 -->
        <div class="dialog-pagination" v-if="totalQuestions > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[5, 10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalQuestions"
            @size-change="handleQuestionSizeChange"
            @current-change="handleQuestionPageChange"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.edit-exam-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.exam-form-card {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.question-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
}

/* 题目列表样式 */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.question-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  position: relative;
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

.question-content {
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.6;
}

.question-options {
  margin-top: 10px;
}

.option-item {
  display: flex;
  margin-bottom: 5px;
}

.option-label {
  width: 30px;
  font-weight: bold;
}

.question-answer {
  margin-top: 10px;
  color: #409eff;
}

.question-programming {
  margin-top: 10px;
  border-top: 1px dashed #ebeef5;
  padding-top: 10px;
}

.question-default-program pre, 
.question-answer pre {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  margin: 5px 0;
}

/* 对话框样式 */
.question-dialog-content {
  padding: 0 10px;
}

.dialog-toolbar {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
}

.filter-section {
  display: flex;
  align-items: center;
}

.dialog-question-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.dialog-question-item {
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.dialog-question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dialog-question-content {
  margin-bottom: 10px;
  line-height: 1.6;
}

.dialog-question-options {
  margin-top: 10px;
}

.dialog-option-item {
  display: flex;
  margin-bottom: 5px;
}

.dialog-option-label {
  width: 30px;
  font-weight: bold;
}

.dialog-question-answer {
  margin-top: 10px;
  color: #409eff;
}

.dialog-question-programming {
  margin-top: 10px;
  border-top: 1px dashed #ebeef5;
  padding-top: 10px;
}

.dialog-pagination {
  margin-top: 20px;
  text-align: center;
}
</style>