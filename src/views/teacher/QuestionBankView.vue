<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(true)
const searchText = ref('')
const selectedType = ref('all')
const questions = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 获取题目列表
const fetchQuestions = async () => {
  loading.value = true
  
  try {
    // 构建请求参数
    const params = {
      current: currentPage.value,
      pageSize: pageSize.value,
      sortField: "",
      sortOrder: ""
    }
    
    // 如果有搜索关键词，添加到请求参数
    if (searchText.value) {
      params.title = searchText.value
    }
    
    // 如果选择了特定类型，添加到请求参数
    if (selectedType.value !== 'all') {
      params.type = selectedType.value
    }
    
    const res = await request({
      url: '/op/list/page',
      method: 'post',
      data: params
    })
    
    console.log('API返回的完整数据:', res)
    
    if (res.code === 0 && res.data) {
      // 将后端返回的题目数据格式化为组件使用的格式
      const formattedQuestions = (res.data.records || []).map(item => {
        // 基本题目信息
        const question = {
          id: item.id,
          type: item.type || 'single', // 使用后端返回的题型，默认为单选题
          content: item.title,
          createTime: item.createTime ? new Date(item.createTime).toLocaleString() : new Date().toLocaleString()
        }
        
        // 根据题型添加特定字段
        if (item.type === 'single' || !item.type) {
          // 默认为单选题类型
          console.log('单选题数据:', item)
          
          // 组装选项数据
          const options = []
          if (item.optionA) {
            options.push({ label: 'A', content: item.optionA })
          }
          if (item.optionB) {
            options.push({ label: 'B', content: item.optionB })
          }
          if (item.optionC) {
            options.push({ label: 'C', content: item.optionC })
          }
          if (item.optionD) {
            options.push({ label: 'D', content: item.optionD })
          }
          
          Object.assign(question, {
            type: 'single', // 确保类型为单选题
            options: options,
            answer: item.answer || ''
          })
          
          console.log('格式化后的单选题数据:', question)
        } else if (item.type === 'fill') {
          Object.assign(question, {
            fillAnswer: item.fillAnswer || ''
          })
        } else if (item.type === 'text') {
          Object.assign(question, {
            referenceAnswer: item.referenceAnswer || ''
          })
        } else if (item.type === 'programming') {
          Object.assign(question, {
            programmingAnswer: item.programmingAnswer || '',
            testCases: item.testCases || ''
          })
        }
        
        return question
      })
      
      questions.value = formattedQuestions
      total.value = parseInt(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '获取题目列表失败')
    }
  } catch (error) {
    console.error('获取题目列表出错', error)
    ElMessage.error('获取题目列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 监听搜索条件变化，重新加载数据
watch([searchText, selectedType], () => {
  currentPage.value = 1 // 重置到第一页
  fetchQuestions()
})

// 页码变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchQuestions()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchQuestions()
}

onMounted(() => {
  fetchQuestions()
})

const typeFilters = [
  { value: 'all', label: '全部类型' },
  { value: 'single', label: '单选题' },
  { value: 'fill', label: '填空题' },
  { value: 'text', label: '简答题' },
  { value: 'programming', label: '编程题' }
]

const getTypeText = (type) => {
  const typeMap = {
    'single': '单选题',
    'fill': '填空题',
    'text': '简答题',
    'programming': '编程题'
  }
  return typeMap[type] || '单选题'
}

// 已经使用服务器端分页和筛选，所以直接返回题目列表
const filteredQuestions = computed(() => {
  return questions.value
})

const handleCreateQuestion = () => {
  router.push('/teacher/create-question')
}

const handleEditQuestion = (question) => {
  // 跳转到编辑页面，传入题目ID
  router.push({
    path: '/teacher/edit-question',
    query: { id: question.id }
  })
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
  ).then(async () => {
    try {
      const res = await request({
        url: '/op/delete',
        method: 'post',
        data: {
          id: question.id
        }
      })
      
      if (res.code === 0) {
        ElMessage({
          type: 'success',
          message: '删除成功'
        })
        
        // 重新加载题目列表
        fetchQuestions()
      } else {
        ElMessage({
          type: 'error',
          message: res.message || '删除失败'
        })
      }
    } catch (error) {
      console.error('删除题目失败', error)
      ElMessage({
        type: 'error',
        message: '删除失败: ' + (error.message || '未知错误')
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
          总计 {{ total }} 题
        </div>
      </div>
      
      <div class="question-list" v-loading="loading">
        <div v-for="question in filteredQuestions" :key="question.id" class="question-item">
          <div class="question-header">
            <div class="question-type">
              <el-tag :type="
                question.type === 'single' ? 'primary' : 
                (question.type === 'fill' ? 'success' : 
                (question.type === 'text' ? 'warning' : 'danger'))
              ">
                {{ getTypeText(question.type) }}
              </el-tag>
            </div>
            <div class="question-actions">
              <el-button type="primary" size="small" @click="handleEditQuestion(question)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDeleteQuestion(question)">删除</el-button>
            </div>
          </div>
          
          <div class="question-content">{{ question.content }}</div>
          
          <!-- 单选题选项 -->
          <div v-if="question.type === 'single' && question.options && question.options.length > 0" class="question-options">
            <div v-for="option in question.options" :key="option.label" class="option-item">
              <span 
                :class="{ 
                  'option-label': true, 
                  'correct-answer': question.answer === option.label
                }"
              >
                {{ option.label }}
              </span>
              <span class="option-content">{{ option.content }}</span>
            </div>
            <div class="question-answer">
              <strong>正确答案：</strong> {{ question.answer }}
            </div>
          </div>
          
          <!-- 填空题答案 -->
          <div v-if="question.type === 'fill'" class="question-reference">
            <div class="reference-label">正确答案：</div>
            <div class="reference-content">{{ question.fillAnswer }}</div>
          </div>
          
          <!-- 简答题参考答案 -->
          <div v-if="question.type === 'text'" class="question-reference">
            <div class="reference-label">参考答案：</div>
            <div class="reference-content">{{ question.referenceAnswer }}</div>
          </div>
          
          <!-- 编程题答案 -->
          <div v-if="question.type === 'programming'" class="question-reference">
            <div class="reference-label">参考代码：</div>
            <div class="reference-content code-block">{{ question.programmingAnswer }}</div>
            <div class="reference-label test-cases-label">测试用例：</div>
            <div class="reference-content test-cases">{{ question.testCases }}</div>
          </div>
          
          <div class="question-footer">
            <span class="create-time">创建时间：{{ question.createTime }}</span>
          </div>
        </div>
        
        <el-empty v-if="filteredQuestions.length === 0 && !loading" description="暂无符合条件的题目"></el-empty>
      </div>
      
      <!-- 分页控件 -->
      <div class="pagination" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[5, 10, 20, 50]"
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

.code-block {
  font-family: monospace;
  background-color: #f1f1f1;
  padding: 10px;
  border-radius: 3px;
  margin-bottom: 10px;
}

.test-cases-label {
  margin-top: 10px;
}

.test-cases {
  font-family: monospace;
}

.question-answer {
  margin-top: 10px;
  padding: 5px 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
  color: #67C23A;
  font-weight: bold;
}

.question-footer {
  display: flex;
  justify-content: flex-end;
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 