<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()
const loading = ref(false)

const classForm = reactive({
  className: ''
})

const rules = {
  className: [
    { required: true, message: '请输入班级名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

const formRef = ref(null)

const handleSubmit = async () => {
  if (!formRef.value) return
  
  formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 调用创建班级接口
        const res = await request({
          url: '/class/create',
          method: 'post',
          data: classForm
        })
        
        if (res.code === 0) {
          ElMessage.success('班级创建成功')
          // 跳转到班级列表
          router.push('/teacher/class-list')
        } else {
          ElMessage.error(res.message || '创建失败')
        }
      } catch (error) {
        console.error('创建班级出错', error)
        ElMessage.error('创建失败，请稍后重试')
      } finally {
        loading.value = false
      }
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
        <el-form-item label="班级名称" prop="className">
          <el-input v-model="classForm.className" placeholder="请输入班级名称，例如：高一(1)班"></el-input>
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