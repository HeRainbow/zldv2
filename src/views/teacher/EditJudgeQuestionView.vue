<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()
const questionId = route.query.id
const loading = ref(false)
const formRef = ref(null)

// 标签相关变量
const inputTagVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)

// 题目表单数据
const questionForm = reactive({
  id: questionId,
  title: '',
  answer: 1, // 1表示"正确"，0表示"错误"
  tags: [] // 题目标签
})

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入题目内容', trigger: 'blur' },
    { min: 2, message: '题目内容至少包含2个字符', trigger: 'blur' }
  ]
}

// 获取判断题详情
const fetchQuestionDetail = async () => {
  if (!questionId) {
    ElMessage.error('题目ID不能为空')
    router.push('/teacher/judge-questions')
    return
  }
  
  loading.value = true
  console.log('获取判断题详情，ID:', questionId)
  
  try {
    // 获取判断题详情
    const res = await request({
      url: '/judge/list/page',
      method: 'post',
      data: {
        id: Number(questionId),
        current: 1,
        pageSize: 1
      }
    })
    
    if (res.code === 0 && res.data && res.data.records && res.data.records.length > 0) {
      // 填充表单数据
      const questionData = res.data.records[0]
      questionForm.id = questionData.id // 确保使用后端返回的ID
      questionForm.title = questionData.title
      
      // 判断题答案处理（0表示错误，1表示正确）
      questionForm.answer = Number(questionData.answer)
      
      // 确保tags是数组
      if (questionData.tags) {
        if (typeof questionData.tags === 'string') {
          try {
            // 如果是字符串，尝试解析成数组
            questionForm.tags = JSON.parse(questionData.tags) || []
          } catch (e) {
            console.error('解析tags失败:', e)
            questionForm.tags = []
          }
        } else if (Array.isArray(questionData.tags)) {
          // 如果直接是数组则直接使用
          questionForm.tags = questionData.tags
        } else {
          questionForm.tags = []
        }
      } else {
        questionForm.tags = []
      }
      
      console.log('判断题详情获取成功:', questionData)
    } else {
      ElMessage.error(res.message || '获取判断题详情失败')
    }
  } catch (error) {
    console.error('获取判断题详情失败', error)
    ElMessage.error('获取判断题详情失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 更新判断题
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 构建判断题更新数据
      const updateData = {
        id: Number(questionForm.id),
        title: questionForm.title,
        answer: questionForm.answer,
        tags: questionForm.tags // 确保tags是数组
      }
      
      console.log('更新判断题数据:', updateData)
      
      // 调用更新判断题接口
      request({
        url: '/judge/update',
        method: 'post',
        data: updateData
      })
      .then(res => {
        loading.value = false
        if (res.code === 0) {
          ElMessage.success('判断题更新成功')
          // 跳转到判断题列表页
          router.push('/teacher/judge-questions')
        } else {
          ElMessage.error(res.message || '更新失败')
        }
      })
      .catch(error => {
        loading.value = false
        ElMessage.error('更新失败: ' + (error.message || '未知错误'))
        console.error('更新判断题失败:', error)
      })
    }
  })
}

// 取消更新
const handleCancel = () => {
  router.push('/teacher/judge-questions')
}

// 预览题目
const handlePreview = () => {
  console.log('预览判断题', questionForm)
}

// 显示标签输入框
const showTagInput = () => {
  inputTagVisible.value = true
  nextTick(() => {
    tagInputRef.value.input.focus()
  })
}

// 添加标签
const handleAddTag = () => {
  const inputValue = tagInputValue.value
  if (inputValue) {
    // 避免重复添加相同标签
    if (!questionForm.tags.includes(inputValue)) {
      questionForm.tags.push(inputValue)
    }
  }
  inputTagVisible.value = false
  tagInputValue.value = ''
}

// 删除标签
const handleRemoveTag = (index) => {
  questionForm.tags.splice(index, 1)
}

onMounted(() => {
  fetchQuestionDetail()
})
</script>

<template>
  <div class="edit-judge-question-container">
    <div class="page-header">
      <h2>编辑判断题</h2>
    </div>
    
    <el-card class="question-form-card" v-loading="loading">
      <el-form
        ref="formRef"
        :model="questionForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="题目内容" prop="title">
          <el-input
            v-model="questionForm.title"
            type="textarea"
            :rows="3"
            placeholder="请输入题目内容"
          ></el-input>
        </el-form-item>
        
        <!-- 题目标签 -->
        <el-form-item label="题目标签">
          <el-tag
            v-for="(tag, index) in questionForm.tags"
            :key="index"
            closable
            @close="handleRemoveTag(index)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          
          <el-input
            v-if="inputTagVisible"
            ref="tagInputRef"
            v-model="tagInputValue"
            class="tag-input"
            size="small"
            @keyup.enter="handleAddTag"
            @blur="handleAddTag"
          />
          
          <el-button v-else class="button-new-tag" size="small" @click="showTagInput">
            + 添加标签
          </el-button>
        </el-form-item>
        
        <!-- 判断题答案 -->
        <el-form-item label="正确答案" prop="answer">
          <el-radio-group v-model="questionForm.answer">
            <el-radio :label="1">正确</el-radio>
            <el-radio :label="0">错误</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">保存题目</el-button>
          <el-button @click="handlePreview">预览</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.edit-judge-question-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.question-form-card {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

/* 标签相关样式 */
.tag-item {
  margin-right: 10px;
  margin-bottom: 10px;
}

.button-new-tag {
  margin-bottom: 10px;
}

.tag-input {
  width: 120px;
  margin-right: 10px;
  vertical-align: bottom;
}
</style> 