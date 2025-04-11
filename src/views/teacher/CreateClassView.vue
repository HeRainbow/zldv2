<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)

const classForm = reactive({
  name: '',
  year: new Date().getFullYear().toString(),
  description: ''
})

const rules = {
  name: [
    { required: true, message: '请输入班级名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  year: [
    { required: true, message: '请选择年份', trigger: 'change' }
  ]
}

const formRef = ref(null)

const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      // 模拟提交
      setTimeout(() => {
        loading.value = false
        // 提示创建成功
        ElMessage({
          type: 'success',
          message: '班级创建成功'
        })
        // 跳转到班级列表
        router.push('/teacher/class-list')
      }, 1000)
    }
  })
}

const handleCancel = () => {
  router.push('/teacher/class-list')
}
</script>

<template>
  <div class="create-class-container">
    <div class="page-header">
      <h2>创建班级</h2>
    </div>
    
    <el-card class="class-form-card">
      <el-form
        ref="formRef"
        :model="classForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="班级名称" prop="name">
          <el-input v-model="classForm.name" placeholder="请输入班级名称，例如：高一(1)班"></el-input>
        </el-form-item>
        
        <el-form-item label="年份" prop="year">
          <el-select v-model="classForm.year" placeholder="请选择年份" style="width: 100%">
            <el-option
              v-for="year in [2022, 2023, 2024, 2025]"
              :key="year"
              :label="year + '年'"
              :value="year.toString()"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="班级描述" prop="description">
          <el-input
            v-model="classForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入班级描述"
          ></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">创建班级</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.create-class-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.class-form-card {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}
</style> 