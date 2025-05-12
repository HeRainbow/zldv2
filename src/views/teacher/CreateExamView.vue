<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
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

// 获取选择题列表
const fetchChoiceQuestions = async () => {
  loadingQuestions.value = true
  
  try {
    const res = await request({
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
      const formattedQuestions = (res.data.records || []).map(item => {
        return {
          id: item.id,
          type: 'single', // 默认为单选题
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
      
      questions.value = formattedQuestions
      totalQuestions.value = parseInt(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '获取题目列表失败')
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
  fetchChoiceQuestions()
}

// 每页条数变化
const handleQuestionSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchChoiceQuestions()
}

onMounted(() => {
  // 获取班级列表
  fetchClassList()
  
  // 获取题目列表
  fetchChoiceQuestions()
})

const typeFilters = [
  { value: 'all', label: '全部类型' },
  { value: 'single', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'text', label: '简答题' }
]

const getTypeText = (type) => {
  const typeMap = {
    'single': '单选题',
    'multiple': '多选题',
    'text': '简答题'
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
  selectedQuestions.value.push(question)
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
      
      // 模拟提交
      setTimeout(() => {
        loading.value = false
        
        ElMessage({
          type: 'success',
          message: '考试创建成功'
        })
        
        // 跳转到考试列表页
        router.push('/teacher/exam-list')
      }, 1000)
    }
  })
}

const handleCancel = () => {
  router.push('/teacher/exam-list')
}
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
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
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
              已选择 {{ selectedQuestions.length }} 道题目 / 总分值: {{ calculateTotalPoints }} 分
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
                  <span class="question-points">{{ question.points }}分</span>
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
              
              <!-- 显示题目选项 -->
              <div v-if="question.type === 'single' || question.type === 'multiple'" class="question-options">
                <div v-for="option in question.options" :key="option.label" class="option-item">
                  <span class="option-label">{{ option.label }}</span>
                  <span class="option-content">{{ option.content }}</span>
                </div>
                <div class="question-answer">
                  <strong>正确答案：</strong>
                  <span v-if="question.type === 'single'">{{ question.answer }}</span>
                  <span v-else>{{ question.answers ? question.answers.join(', ') : '' }}</span>
                </div>
              </div>
              
              <!-- 显示参考答案(简答题) -->
              <div v-if="question.type === 'text'" class="question-reference">
                <strong>参考答案：</strong>
                <div class="reference-content">{{ question.referenceAnswer }}</div>
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
                <el-tag :type="question.type === 'single' ? 'primary' : (question.type === 'multiple' ? 'success' : 'warning')">
                  {{ getTypeText(question.type) }}
                </el-tag>
                <span class="dialog-question-points">{{ question.points }}分</span>
              </div>
              <el-button type="primary" size="small" @click="handleAddQuestion(question)">添加</el-button>
            </div>
            
            <div class="dialog-question-content">{{ question.content }}</div>
            
            <div v-if="question.type === 'single' || question.type === 'multiple'" class="dialog-question-options">
              <div v-for="option in question.options" :key="option.label" class="dialog-option-item">
                <span class="dialog-option-label">{{ option.label }}</span>
                <span class="dialog-option-content">{{ option.content }}</span>
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
</style> 