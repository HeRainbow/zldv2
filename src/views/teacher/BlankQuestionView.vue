<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(true)
const searchText = ref('')
const questions = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 获取填空题列表
const fetchBlankQuestions = async () => {
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
    
    // 调用填空题专用接口
    const res = await request({
      url: '/blank/list/page',
      method: 'post',
      data: params
    })
    
    console.log('填空题API返回的完整数据:', res)
    
    if (res.code === 0 && res.data) {
      // 将后端返回的填空题数据格式化
      questions.value = (res.data.records || []).map(item => {
        // 处理标签数据
        let tags = []
        
        // 直接使用后端返回的数组，或者尝试解析字符串
        if (Array.isArray(item.tags)) {
          tags = item.tags
        } else if (typeof item.tags === 'string') {
          try {
            const parsedTags = JSON.parse(item.tags || '[]')
            tags = Array.isArray(parsedTags) ? parsedTags : []
          } catch (e) {
            console.error('解析标签失败:', e)
          }
        }
        
        return {
          id: item.id,
          title: item.title,
          tags: tags,
          answer: item.answer,
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
      ElMessage.error(res.message || '获取填空题列表失败')
    }
  } catch (error) {
    console.error('获取填空题列表出错', error)
    ElMessage.error('获取填空题列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 监听搜索条件变化，重新加载数据
watch(searchText, () => {
  currentPage.value = 1 // 重置到第一页
  fetchBlankQuestions()
})

// 页码变化
const handlePageChange = (page) => {
  currentPage.value = page
  fetchBlankQuestions()
}

// 每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  fetchBlankQuestions()
}

// 删除问题
const handleDeleteQuestion = (question) => {
  ElMessage.confirm(`确定要删除题目 "${question.title}" 吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const res = await request({
        url: '/blank/delete',
        method: 'post',
        data: { id: question.id }
      })
      
      if (res.code === 0) {
        ElMessage.success('删除成功')
        fetchBlankQuestions() // 重新加载数据
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
    path: '/teacher/edit-blank-question',
    query: { id: question.id }
  })
}

// 创建新题目
const handleCreateQuestion = () => {
  router.push('/teacher/create-blank-question')
}

onMounted(() => {
  fetchBlankQuestions()
})
</script>

<template>
  <div class="blank-question-container">
    <div class="page-header">
      <h2>填空题管理</h2>
      <el-button type="primary" @click="handleCreateQuestion">创建填空题</el-button>
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
              <el-tag type="success">填空题</el-tag>
            </div>
            <div class="question-actions">
              <el-button type="primary" size="small" @click="handleEditQuestion(question)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDeleteQuestion(question)">删除</el-button>
            </div>
          </div>
          
          <div class="question-content">{{ question.title }}</div>
          
          <!-- 填空题答案 -->
          <div class="question-reference">
            <div class="reference-label">正确答案：</div>
            <div class="reference-content">{{ question.answer }}</div>
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
            <span class="stats">
              <el-tooltip content="提交次数" placement="top">
                <span class="stat-item">提交: {{ question.submitNum }}</span>
              </el-tooltip>
              <el-tooltip content="通过次数" placement="top">
                <span class="stat-item">通过: {{ question.acceptedNum }}</span>
              </el-tooltip>
              <el-tooltip content="点赞数" placement="top">
                <span class="stat-item">点赞: {{ question.thumbNum }}</span>
              </el-tooltip>
            </span>
          </div>
        </div>
        
        <el-empty v-if="questions.length === 0 && !loading" description="暂无填空题"></el-empty>
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
.blank-question-container {
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
  color: #67C23A;
  white-space: pre-wrap;
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

.stats {
  display: flex;
  gap: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>