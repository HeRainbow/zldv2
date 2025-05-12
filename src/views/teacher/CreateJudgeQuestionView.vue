<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(false)
const formRef = ref(null)

// 标签相关变量
const inputTagVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)

// 题目表单数据
const questionForm = reactive({
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

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 构建判断题数据
      const judgeData = {
        title: questionForm.title,
        answer: questionForm.answer,
        tags: questionForm.tags // 确保tags是数组
      }
      
      console.log('提交判断题数据:', judgeData)
      
      // 调用添加判断题接口
      request({
        url: '/judge/add',
        method: 'post',
        data: judgeData
      })
      .then(res => {
        loading.value = false
        if (res.code === 0) {
          ElMessage.success('判断题创建成功')
          // 跳转到判断题列表页
          router.push('/teacher/judge-questions')
        } else {
          ElMessage.error(res.message || '创建失败')
        }
      })
      .catch(error => {
        loading.value = false
        ElMessage.error('创建失败: ' + (error.message || '未知错误'))
        console.error('创建判断题失败:', error)
      })
    }
  })
}

// 取消创建
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
</script>

<template>
  <div class="create-judge-question-container">
    <div class="page-header">
      <h2>创建判断题</h2>
    </div>
    
    <el-card class="question-form-card">
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
.create-judge-question-container {
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