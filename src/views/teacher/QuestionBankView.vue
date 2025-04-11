<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(true)
const searchText = ref('')
const selectedType = ref('all')

const questions = ref([])

onMounted(() => {
  // 模拟获取题目列表
  setTimeout(() => {
    questions.value = [
      {
        id: 1,
        type: 'single',
        content: '下列哪个不是JavaScript的数据类型？',
        options: [
          { label: 'A', content: 'String' },
          { label: 'B', content: 'Number' },
          { label: 'C', content: 'Boolean' },
          { label: 'D', content: 'Char' }
        ],
        answer: 'D',
        points: 5,
        createTime: '2023-06-15'
      },
      {
        id: 2,
        type: 'multiple',
        content: '以下哪些是Vue的生命周期钩子？',
        options: [
          { label: 'A', content: 'mounted' },
          { label: 'B', content: 'created' },
          { label: 'C', content: 'rendering' },
          { label: 'D', content: 'destroyed' }
        ],
        answers: ['A', 'B', 'D'],
        points: 5,
        createTime: '2023-06-16'
      },
      {
        id: 3,
        type: 'text',
        content: '简述Vue组合式API的优势',
        referenceAnswer: 'Vue组合式API的优势包括更好的代码组织、逻辑复用、类型推导支持以及更小的生产包体积。',
        points: 10,
        createTime: '2023-06-18'
      }
    ]
    loading.value = false
  }, 1000)
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
  let result = questions.value
  
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

const handleCreateQuestion = () => {
  router.push('/teacher/create-question')
}

const handleEditQuestion = (question) => {
  // 实际应用中应该跳转到编辑页面，可以传入题目ID
  console.log('编辑题目', question)
}

const handleDeleteQuestion = (question) => {
  ElMessageBox.confirm(
    '确定要删除该题目吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 模拟删除
    const index = questions.value.findIndex(q => q.id === question.id)
    if (index !== -1) {
      questions.value.splice(index, 1)
      ElMessage({
        type: 'success',
        message: '删除成功'
      })
    }
  }).catch(() => {
    // 取消删除
  })
}
</script>

<template>
  <div class="question-bank-container">
    <div class="page-header">
      <h2>题库管理</h2>
      <el-button type="primary" @click="handleCreateQuestion">创建题目</el-button>
    </div>
    
    <el-card class="question-list-card">
      <div class="toolbar">
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
        <div class="stats-section">
          总计 {{ filteredQuestions.length }} 题
        </div>
      </div>
      
      <div class="question-list" v-loading="loading">
        <div v-for="question in filteredQuestions" :key="question.id" class="question-item">
          <div class="question-header">
            <div class="question-type">
              <el-tag :type="question.type === 'single' ? 'primary' : (question.type === 'multiple' ? 'success' : 'warning')">
                {{ getTypeText(question.type) }}
              </el-tag>
              <span class="question-points">{{ question.points }}分</span>
            </div>
            <div class="question-actions">
              <el-button type="primary" size="small" @click="handleEditQuestion(question)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDeleteQuestion(question)">删除</el-button>
            </div>
          </div>
          
          <div class="question-content">{{ question.content }}</div>
          
          <div v-if="question.type === 'single' || question.type === 'multiple'" class="question-options">
            <div v-for="option in question.options" :key="option.label" class="option-item">
              <span 
                :class="{ 
                  'option-label': true, 
                  'correct-answer': question.type === 'single' ? question.answer === option.label : (question.answers && question.answers.includes(option.label))
                }"
              >
                {{ option.label }}
              </span>
              <span class="option-content">{{ option.content }}</span>
            </div>
          </div>
          
          <div v-if="question.type === 'text'" class="question-reference">
            <div class="reference-label">参考答案：</div>
            <div class="reference-content">{{ question.referenceAnswer }}</div>
          </div>
          
          <div class="question-footer">
            <span class="create-time">创建时间：{{ question.createTime }}</span>
          </div>
        </div>
        
        <el-empty v-if="filteredQuestions.length === 0 && !loading" description="暂无符合条件的题目"></el-empty>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.question-bank-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.question-list-card {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-section {
  display: flex;
  align-items: center;
}

.stats-section {
  color: #666;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.question-type {
  display: flex;
  align-items: center;
}

.question-points {
  margin-left: 10px;
  color: #F56C6C;
}

.question-content {
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 15px;
}

.question-options {
  margin-bottom: 15px;
}

.option-item {
  display: flex;
  margin-bottom: 8px;
}

.option-label {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f5f7fa;
  margin-right: 10px;
}

.correct-answer {
  background-color: #67C23A;
  color: white;
}

.option-content {
  line-height: 30px;
}

.question-reference {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.reference-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.reference-content {
  color: #67C23A;
  white-space: pre-wrap;
}

.question-footer {
  display: flex;
  justify-content: flex-end;
  color: #909399;
  font-size: 12px;
}
</style> 