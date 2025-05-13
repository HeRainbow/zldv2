<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const formRef = ref(null)
const classList = ref([])
const questions = ref([])
const selectedQuestions = ref([])
const questionDialogVisible = ref(false)
const searchText = ref('')
const selectedType = ref('all')
const loadingClasses = ref(true)
const loadingQuestions = ref(true)
const currentPage = ref(1)
const pageSize = ref(10)
const totalQuestions = ref(0)

const examForm = reactive({
  title: '',
  classes: [],
  startTime: '',
  duration: 120,
  description: '',
  totalPoints: 0
})

const rules = {
  title: [
    { required: true, message: '请输入考试名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  classes: [
    { required: true, message: '请选择班级', trigger: 'change' },
    { type: 'array', min: 1, message: '至少选择一个班级', trigger: 'change' }
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

onMounted(() => {
  // 获取班级列表
  fetchClassList()
  
  // 获取题目列表
  fetchQuestions()
})

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

const filteredQuestions = computed(() => {
  let result = questions.value.filter(q => !selectedQuestions.value.some(sq => sq.id === q.id))
  
  // 按类型筛选
  if (selectedType.value !== 'all') {
    result = result.filter(q => q.type === selectedType.value)
  }
  
  // 按关键词搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(q => {
      return q.content.toLowerCase().includes(keyword)
    })
  }
  
  return result
})

const calculateTotalPoints = computed(() => {
  return selectedQuestions.value.reduce((total, question) => total + question.points, 0)
})

const handleShowQuestionDialog = () => {
  questionDialogVisible.value = true
}

const handleAddQuestion = (question) => {
  selectedQuestions.value.push({
    ...question,
    // 为不同题型设置不同的默认分值
    points: question.type === 'program' ? 10 : 5
  })
  updateTotalPoints()
}

const handleRemoveQuestion = (questionId) => {
  const index = selectedQuestions.value.findIndex(q => q.id === questionId)
  if (index !== -1) {
    selectedQuestions.value.splice(index, 1)
    updateTotalPoints()
  }
}

const updateTotalPoints = () => {
  examForm.totalPoints = calculateTotalPoints.value
}

const handleMoveUp = (index) => {
  if (index > 0) {
    const temp = selectedQuestions.value[index]
    selectedQuestions.value[index] = selectedQuestions.value[index - 1]
    selectedQuestions.value[index - 1] = temp
  }
}

const handleMoveDown = (index) => {
  if (index < selectedQuestions.value.length - 1) {
    const temp = selectedQuestions.value[index]
    selectedQuestions.value[index] = selectedQuestions.value[index + 1]
    selectedQuestions.value[index + 1] = temp
  }
}

const handleSubmit = () => {
  if (selectedQuestions.value.length === 0) {
    ElMessage.warning('请添加至少一道题目')
    return
  }
  
  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 构建要提交的考试数据
      const optionalScore = {}  // 单选题分数
      const blankScore = {}     // 填空题分数
      const judgementScore = {} // 判断题分数
      const programScore = {}   // 编程题分数
      
      // 为各类题目设置分数
      selectedQuestions.value.forEach(question => {
        const questionId = question.id.toString()
        
        switch(question.type) {
          case 'single':
            optionalScore[questionId] = question.points
            break
          case 'fill':
            blankScore[questionId] = question.points
            break
          case 'judge':
            judgementScore[questionId] = question.points
            break
          case 'program':
            programScore[questionId] = question.points
            break
        }
      })
      
      // 计算考试结束时间
      const startTime = new Date(examForm.startTime)
      const endTime = new Date(startTime.getTime() + examForm.duration * 60 * 1000)

      // 格式化为Java LocalDateTime格式 (yyyy-MM-ddTHH:mm:ss)
      const formatToLocalDateTime = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }

      const startTimeFormatted = formatToLocalDateTime(startTime)
      const endTimeFormatted = formatToLocalDateTime(endTime)
      
      // 处理创建成功的函数
      const handleCreateSuccess = (res) => {
        loading.value = false
        
        if (res.code === 0) {
          ElMessage({
            type: 'success',
            message: '考试创建成功'
          })
          
          // 跳转到考试列表页
          router.push('/teacher/exam-list')
        } else {
          ElMessage({
            type: 'error',
            message: res.message || '创建考试失败'
          })
        }
      }
      
      // 处理创建失败的函数
      const handleCreateError = (error) => {
        loading.value = false
        ElMessage({
          type: 'error',
          message: '创建考试失败: ' + (error.message || '未知错误')
        })
        console.error('创建考试失败:', error)
      }
      
      // 提交考试数据
      const createExam = async (classId) => {
        // 构建提交数据
        const examData = {
          allScore: calculateTotalPoints.value,             // 总分值
          blankScore: Object.keys(blankScore).length ? blankScore : {},  // 填空题分数
          classId: classId,                                 // 班级ID
          endTime: endTimeFormatted,                              // 结束时间
          examName: examForm.title,                         // 考试名称
          judgementScore: Object.keys(judgementScore).length ? judgementScore : {},  // 判断题分数
          optionalScore: Object.keys(optionalScore).length ? optionalScore : {},     // 单选题分数
          programScore: Object.keys(programScore).length ? programScore : {},        // 编程题分数
          startTime: startTimeFormatted                     // 开始时间
        }
        
        return request({
          url: '/exam/create',
          method: 'post',
          data: examData
        })
      }

      // 处理多班级的考试创建
      if (examForm.classes.length === 1) {
        // 单班级直接创建
        createExam(examForm.classes[0])
          .then(handleCreateSuccess)
          .catch(handleCreateError)
      } else {
        // 多班级循环创建
        let successCount = 0
        let failCount = 0
        
        const promises = examForm.classes.map(classId => {
          return createExam(classId)
            .then(res => {
              if (res.code === 0) {
                successCount++
              } else {
                failCount++
                console.error(`班级 ${classId} 创建失败:`, res.message)
              }
              return res
            })
            .catch(error => {
              failCount++
              console.error(`班级 ${classId} 创建失败:`, error)
              return error
            })
        })
        
        // 等待所有请求完成
        Promise.all(promises)
          .then(() => {
            loading.value = false
            
            if (successCount > 0) {
              ElMessage({
                type: 'success',
                message: `已成功创建 ${successCount} 个班级的考试${failCount > 0 ? `，${failCount} 个班级创建失败` : ''}`
              })
              
              // 跳转到考试列表页
              router.push('/teacher/exam-list')
            } else {
              ElMessage({
                type: 'error',
                message: '创建考试失败'
              })
            }
          })
          .catch(error => {
            loading.value = false
            ElMessage({
              type: 'error',
              message: '创建考试失败: ' + (error.message || '未知错误')
            })
            console.error('创建考试失败:', error)
          })
      }
    }
  })
}

const handleCancel = () => {
  router.push('/teacher/exam-list')
}

// 监听题型变化，重新加载题目
watch(selectedType, () => {
  currentPage.value = 1 // 重置页码
  fetchQuestions()
})

// 监听搜索文本变化
watch(searchText, () => {
  // 防抖：可以在实际应用中添加防抖逻辑
  if (selectedType.value === 'all') {
    // 如果是全部，直接过滤本地数据
    // 已经在计算属性filteredQuestions中实现
  } else {
    // 如果是特定类型，可以重新请求后端
    currentPage.value = 1
    fetchQuestions()
  }
})
</script>

<template>
  <div class="create-exam-container">
    <div class="page-header">
      <h2>创建考试</h2>
    </div>
    
    <el-card class="exam-form-card">
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
        
        <el-form-item label="选择班级" prop="classes" v-loading="loadingClasses">
          <el-select 
            v-model="examForm.classes" 
            multiple 
            placeholder="请选择参加考试的班级"
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
        
        <el-form-item label="考试说明">
          <el-input
            v-model="examForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入考试说明(选填)"
          ></el-input>
        </el-form-item>
        
        <el-divider>考试题目</el-divider>
        
        <div class="question-section">
          <div class="section-header">
            <div class="section-title">
              已选择 {{ selectedQuestions.length }} 道题目 
            </div>
            <el-button type="primary" @click="handleShowQuestionDialog">添加题目</el-button>
          </div>
          
          <el-empty v-if="selectedQuestions.length === 0" description="请添加题目"></el-empty>
          
          <div v-else class="question-list">
            <div v-for="(question, index) in selectedQuestions" :key="question.id" class="question-item">
              <div class="question-header">
                <div class="question-info">
                  <span class="question-index">{{ index + 1 }}.</span>
                  <el-tag 
                    :type="question.type === 'single' ? 'primary' : (question.type === 'multiple' ? 'success' : 'warning')"
                    size="small"
                  >
                    {{ getTypeText(question.type) }}
                  </el-tag>
                </div>
                <div class="question-actions">
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="handleRemoveQuestion(question.id)"
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
                  <strong>参考答案：</strong>
                  <pre>{{ question.answer }}</pre>
                </div>
                <div v-if="question.judgeCase" class="question-testcases">
                  <strong>测试用例：</strong>
                  <div v-for="(testCase, idx) in (typeof question.judgeCase === 'string' ? JSON.parse(question.judgeCase) : question.judgeCase)" :key="idx" class="testcase-item">
                    <div>输入: {{ testCase.input }}</div>
                    <div>输出: {{ testCase.output }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">创建考试</el-button>
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
              <div v-if="question.judgeCase" class="dialog-question-testcases">
                <strong>测试用例：</strong>
                <div v-for="(testCase, idx) in (typeof question.judgeCase === 'string' ? JSON.parse(question.judgeCase) : question.judgeCase)" :key="idx" class="dialog-testcase-item">
                  <div>输入: {{ testCase.input }}</div>
                  <div>输出: {{ testCase.output }}</div>
                </div>
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
.create-exam-container {
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
}

.question-index {
  font-weight: bold;
  margin-right: 10px;
}

.question-points {
  margin-left: 10px;
  color: #F56C6C;
}

.question-content {
  font-size: 14px;
  line-height: 1.5;
}

/* 对话框样式 */
.question-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.dialog-toolbar {
  margin-bottom: 20px;
}

.dialog-question-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.dialog-question-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
}

.dialog-question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dialog-question-type {
  display: flex;
  align-items: center;
}

.dialog-question-points {
  margin-left: 10px;
  color: #F56C6C;
}

.dialog-question-content {
  font-size: 14px;
  margin-bottom: 10px;
}

.dialog-question-options {
  margin-top: 10px;
}

.dialog-option-item {
  display: flex;
  margin-bottom: 5px;
}

.dialog-option-label {
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f7fa;
  margin-right: 10px;
  font-size: 12px;
}

.dialog-option-content {
  line-height: 25px;
  font-size: 12px;
}

.dialog-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.question-options {
  margin-top: 10px;
  margin-left: 20px;
  border-left: 3px solid #ebeef5;
  padding-left: 10px;
}

.option-item {
  display: flex;
  margin-bottom: 5px;
}

.option-label {
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f7fa;
  margin-right: 10px;
  font-size: 12px;
}

.option-content {
  line-height: 25px;
  font-size: 14px;
}

.question-answer {
  margin-top: 10px;
  color: #67c23a;
}

.question-reference {
  margin-top: 10px;
  margin-left: 20px;
  border-left: 3px solid #ebeef5;
  padding-left: 10px;
}

.reference-content {
  margin-top: 5px;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.question-programming {
  margin-top: 10px;
  margin-left: 20px;
  border-left: 3px solid #ebeef5;
  padding-left: 10px;
}

.question-default-program {
  margin-bottom: 10px;
}

.question-testcases {
  margin-top: 10px;
}

.testcase-item {
  margin-bottom: 5px;
}

.dialog-question-programming {
  margin-top: 10px;
  margin-left: 20px;
  border-left: 3px solid #ebeef5;
  padding-left: 10px;
}

.dialog-question-answer {
  margin-top: 5px;
  color: #67c23a;
}

.dialog-question-default-program,
.dialog-question-testcases {
  margin-top: 10px;
}

.dialog-testcase-item {
  margin-bottom: 5px;
  padding-left: 8px;
  border-left: 2px solid #ebeef5;
}
</style> 