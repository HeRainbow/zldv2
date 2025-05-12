<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(true)
const searchText = ref('')
const questions = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 获取编程题列表
const fetchProgramQuestions = async () => {
  loading.value = true
  
  try {
    // 构建请求参数
    const params = {
      current: currentPage.value,
      pageSize: pageSize.value
    }
    
    // 如果有搜索关键词，添加到请求参数
    if (searchText.value) {
      params.title = searchText.value
    }
    
    // 调用编程题专用接口
    const res = await request({
      url: '/program/list/page',
      method: 'post',
      data: params
    })
    
    console.log('编程题API返回的完整数据:', res)
    
    if (res.code === 0 && res.data) {
      // 将后端返回的编程题数据格式化
      questions.value = (res.data.records || []).map(item => {
        // 解析tags，确保它是一个数组
        let tags = []
        try {
          tags = JSON.parse(item.tags || '[]')
        } catch (e) {
          console.error('解析标签失败:', e)
        }
        
        // 解析judgeCase，确保它是一个数组
        let judgeCase = []
        try {
          judgeCase = JSON.parse(item.judgeCase || '[]')
        } catch (e) {
          console.error('解析测试用例失败:', e)
        }
        
        // 解析judgeConfig，确保它是一个对象
        let judgeConfig = {
          timeLimit: 256,
          memoryLimit: 256,
          stackLimit: 256
        }
        try {
          const parsedConfig = JSON.parse(item.judgeConfig || '{}')
          judgeConfig = {
            ...judgeConfig,
            ...parsedConfig
          }
        } catch (e) {
          console.error('解析判题配置失败:', e)
        }
        
        return {
          id: item.id,
          title: item.title,
          tags: tags,
          answer: item.answer,
          defaultProgram: item.defaultProgram,
          judgeCase: judgeCase,
          judgeConfig: judgeConfig,
          submitNum: item.submitNum,
          acceptedNum: item.acceptedNum,
          thumbNum: item.thumbNum,
          favourNum: item.favourNum,
          userId: item.userId,
          createTime: item.createTime ? new Date(item.createTime).toLocaleString() : '',
          updateTime: item.updateTime ? new Date(item.updateTime).toLocaleString() : '',
          isDelete: item.isDelete
        }
      })
      
      total.value = parseInt(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '获取编程题列表失败')
    }
  } catch (error) {
    console.error('获取编程题列表出错', error)
    ElMessage.error('获取编程题列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 监听搜索条件变化，重新加载数据
watch(searchText, () => {
  currentPage.value = 1 // 重置到第一页
  fetchProgramQuestions()
})

// 页码变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchProgramQuestions()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchProgramQuestions()
}

// 删除问题
const handleDeleteQuestion = (question) => {
  ElMessageBox.confirm(
    `确定要删除题目 "${question.title}" 吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const res = await request({
        url: '/program/delete',
        method: 'post',
        data: { id: question.id }
      })
      
      if (res.code === 0) {
        ElMessage.success('删除成功')
        fetchProgramQuestions() // 重新加载数据
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除题目失败:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 编辑问题
const handleEditQuestion = (question) => {
  router.push({
    path: '/teacher/edit-program-question',
    query: { id: question.id }
  })
}

// 创建新题目
const handleCreateQuestion = () => {
  router.push('/teacher/create-program-question')
}

onMounted(() => {
  fetchProgramQuestions()
})
</script>

<template>
  <div class="program-question-container">
    <div class="page-header">
      <h2>编程题管理</h2>
      <el-button type="primary" @click="handleCreateQuestion">创建编程题</el-button>
    </div>
    
    <el-card class="question-list-card">
      <div class="toolbar">
        <div class="search-section">
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
        <div v-for="question in questions" :key="question.id" class="question-item">
          <div class="question-header">
            <div class="question-type">
              <el-tag type="danger">编程题</el-tag>
            </div>
            <div class="question-actions">
              <el-button type="primary" size="small" @click="handleEditQuestion(question)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDeleteQuestion(question)">删除</el-button>
            </div>
          </div>
          
          <div class="question-content">{{ question.title }}</div>
          
          <!-- 测试用例数量 -->
          <div class="question-reference">
            <div class="reference-label">测试用例：</div>
            <div class="reference-content">
              {{ question.judgeCase.length }} 个测试样例
            </div>
          </div>
          
          <!-- 判题配置 -->
          <div class="judge-config">
            <el-tag size="small" type="info">时间限制: {{ question.judgeConfig.timeLimit }}ms</el-tag>
            <el-tag size="small" type="info">内存限制: {{ question.judgeConfig.memoryLimit }}MB</el-tag>
            <el-tag size="small" type="info">栈限制: {{ question.judgeConfig.stackLimit }}MB</el-tag>
          </div>
          
          <!-- 标签展示 -->
          <div v-if="question.tags && question.tags.length > 0" class="question-tags">
            <span class="tag-label">标签：</span>
            <el-tag 
              v-for="tag in question.tags" 
              :key="tag" 
              size="small" 
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>
          
          <div class="question-footer">
            <span class="create-time">创建时间：{{ question.createTime }}</span>
          </div>
        </div>
        
        <el-empty v-if="questions.length === 0 && !loading" description="暂无编程题"></el-empty>
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
.program-question-container {
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

.question-content {
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 15px;
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
  white-space: pre-wrap;
}

.judge-config {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.question-tags {
  margin-bottom: 15px;
}

.tag-label {
  font-weight: bold;
  margin-right: 10px;
}

.tag-item {
  margin-right: 5px;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  color: #909399;
  font-size: 12px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 