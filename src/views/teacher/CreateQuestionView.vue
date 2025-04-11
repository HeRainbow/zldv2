<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('single')
const formRef = ref(null)

// 题目类型选项
const questionTypes = [
  { value: 'single', label: '单选题' },
  { value: 'multiple', label: '多选题' },
  { value: 'text', label: '简答题' }
]

// 题目表单数据
const questionForm = reactive({
  type: 'single',
  content: '',
  points: 5,
  options: [
    { label: 'A', content: '' },
    { label: 'B', content: '' },
    { label: 'C', content: '' },
    { label: 'D', content: '' }
  ],
  answer: '', // 单选题答案
  answers: [], // 多选题答案
  referenceAnswer: '' // 简答题参考答案
})

// 表单验证规则
const rules = computed(() => {
  const baseRules = {
    content: [
      { required: true, message: '请输入题目内容', trigger: 'blur' },
      { min: 2, message: '题目内容至少包含2个字符', trigger: 'blur' }
    ],
    points: [
      { required: true, message: '请填写分值', trigger: 'blur' },
      { type: 'number', min: 1, message: '分值必须大于0', trigger: 'blur' }
    ]
  }
  
  if (questionForm.type === 'single') {
    return {
      ...baseRules,
      answer: [
        { required: true, message: '请选择正确答案', trigger: 'change' }
      ]
    }
  } else if (questionForm.type === 'multiple') {
    return {
      ...baseRules,
      answers: [
        { required: true, message: '请选择正确答案', trigger: 'change' },
        { type: 'array', min: 1, message: '至少选择一个正确答案', trigger: 'change' }
      ]
    }
  } else {
    return {
      ...baseRules,
      referenceAnswer: [
        { required: true, message: '请输入参考答案', trigger: 'blur' },
        { min: 2, message: '参考答案至少包含2个字符', trigger: 'blur' }
      ]
    }
  }
})

const handleTypeChange = (type) => {
  questionForm.type = type
  activeTab = type
}

const addOption = () => {
  const nextLabel = String.fromCharCode('A'.charCodeAt(0) + questionForm.options.length)
  questionForm.options.push({ label: nextLabel, content: '' })
}

const removeOption = (index) => {
  if (questionForm.options.length <= 2) {
    ElMessage.warning('至少需要保留2个选项')
    return
  }
  
  questionForm.options.splice(index, 1)
  
  // 重新标记选项标签
  questionForm.options.forEach((option, idx) => {
    option.label = String.fromCharCode('A'.charCodeAt(0) + idx)
  })
  
  // 重置答案
  if (questionForm.type === 'single') {
    questionForm.answer = ''
  } else if (questionForm.type === 'multiple') {
    questionForm.answers = []
  }
}

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 模拟提交
      setTimeout(() => {
        loading.value = false
        
        ElMessage({
          type: 'success',
          message: '题目创建成功'
        })
        
        // 跳转到题库列表页
        router.push('/teacher/question-bank')
      }, 1000)
    }
  })
}

const handleCancel = () => {
  router.push('/teacher/question-bank')
}

const handlePreview = () => {
  // 实际应用中可以预览题目
  console.log('预览题目', questionForm)
}
</script>

<template>
  <div class="create-question-container">
    <div class="page-header">
      <h2>创建题目</h2>
    </div>
    
    <el-card class="question-form-card">
      <el-tabs v-model="activeTab" @tab-click="handleTypeChange">
        <el-tab-pane name="single" label="单选题"></el-tab-pane>
        <el-tab-pane name="multiple" label="多选题"></el-tab-pane>
        <el-tab-pane name="text" label="简答题"></el-tab-pane>
      </el-tabs>
      
      <el-form
        ref="formRef"
        :model="questionForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="题目内容" prop="content">
          <el-input
            v-model="questionForm.content"
            type="textarea"
            :rows="3"
            placeholder="请输入题目内容"
          ></el-input>
        </el-form-item>
        
        <el-form-item label="分值" prop="points">
          <el-input-number
            v-model="questionForm.points"
            :min="1"
            :max="100"
            controls-position="right"
          ></el-input-number>
        </el-form-item>
        
        <!-- 选择题选项 -->
        <template v-if="questionForm.type === 'single' || questionForm.type === 'multiple'">
          <el-divider content-position="left">选项</el-divider>
          
          <div v-for="(option, index) in questionForm.options" :key="index" class="option-item">
            <el-row :gutter="10">
              <el-col :span="2">
                <div class="option-label">{{ option.label }}</div>
              </el-col>
              <el-col :span="18">
                <el-input v-model="option.content" placeholder="请输入选项内容"></el-input>
              </el-col>
              <el-col :span="4">
                <el-button type="danger" @click="removeOption(index)" icon="delete" circle></el-button>
              </el-col>
            </el-row>
          </div>
          
          <div class="option-actions">
            <el-button type="primary" plain @click="addOption">添加选项</el-button>
          </div>
          
          <!-- 单选题答案 -->
          <el-form-item v-if="questionForm.type === 'single'" label="正确答案" prop="answer">
            <el-radio-group v-model="questionForm.answer">
              <el-radio
                v-for="option in questionForm.options"
                :key="option.label"
                :label="option.label"
              >
                {{ option.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
          
          <!-- 多选题答案 -->
          <el-form-item v-if="questionForm.type === 'multiple'" label="正确答案" prop="answers">
            <el-checkbox-group v-model="questionForm.answers">
              <el-checkbox
                v-for="option in questionForm.options"
                :key="option.label"
                :label="option.label"
              >
                {{ option.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </template>
        
        <!-- 简答题参考答案 -->
        <template v-if="questionForm.type === 'text'">
          <el-form-item label="参考答案" prop="referenceAnswer">
            <el-input
              v-model="questionForm.referenceAnswer"
              type="textarea"
              :rows="5"
              placeholder="请输入参考答案"
            ></el-input>
          </el-form-item>
        </template>
        
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
.create-question-container {
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

.option-item {
  margin-bottom: 15px;
}

.option-label {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-weight: bold;
}

.option-actions {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}
</style> 