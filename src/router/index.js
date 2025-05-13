import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      redirect:"/login"
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    // 学生端路由
    {
      path: '/student',
      name: 'studentLayout',
      component: () => import('../views/student/StudentLayout.vue'),
      redirect: '/student/exam-list',
      children: [
        {
          path: 'exam-list',
          name: 'studentExamList',
          component: () => import('../views/student/ExamListView.vue'),
        },
        {
          path: 'take-exam/:id',
          name: 'takeExam',
          component: () => import('../views/student/TakeExamView.vue'),
        },
        {
          path: 'scores',
          name: 'studentScores',
          component: () => import('../views/student/ScoresView.vue'),
        },
        {
          path: 'peer-review',
          name: 'peerReview',
          component: () => import('../views/student/PeerReviewView.vue'),
        }
      ]
    },
    // 教师端路由
    {
      path: '/teacher',
      name: 'teacherLayout',
      component: () => import('../views/teacher/TeacherLayout.vue'),
      redirect: '/teacher/class-list',
      children: [
        {
          path: 'class-list',
          name: 'classList',
          component: () => import('../views/teacher/ClassListView.vue'),
        },
        {
          path: 'create-class',
          name: 'createClass',
          component: () => import('../views/teacher/CreateClassView.vue'),
        },
        {
          path: 'exam-list',
          name: 'teacherExamList',
          component: () => import('../views/teacher/ExamListView.vue'),
        },
        {
          path: 'create-exam',
          name: 'createExam',
          component: () => import('../views/teacher/CreateExamView.vue'),
        },
        {
          path: 'question-bank',
          name: 'questionBank',
          component: () => import('../views/teacher/QuestionBankView.vue'),
        },
        {
          path: 'create-question',
          name: 'createQuestion',
          component: () => import('../views/teacher/CreateQuestionView.vue'),
        },
        {
          path: 'edit-question',
          name: 'editQuestion',
          component: () => import('../views/teacher/EditQuestionView.vue'),
        },
        {
          path: 'students-management',
          name: 'studentsManagement',
          component: () => import('../views/teacher/StudentsManagementView.vue'),
        },
        // 填空题管理相关路由
        {
          path: 'blank-questions',
          name: 'blankQuestions',
          component: () => import('../views/teacher/BlankQuestionView.vue'),
        },
        {
          path: 'create-blank-question',
          name: 'createBlankQuestion',
          component: () => import('../views/teacher/CreateQuestionView.vue'),
          props: { defaultType: 'fill' }
        },
        {
          path: 'edit-blank-question',
          name: 'editBlankQuestion',
          component: () => import('../views/teacher/EditQuestionView.vue'),
          props: (route) => ({ 
            id: route.query.id,
            defaultType: 'fill'
          })
        },
        // 判断题管理相关路由
        {
          path: 'judge-questions',
          name: 'judgeQuestions',
          component: () => import('../views/teacher/JudgeQuestionView.vue'),
        },
        {
          path: 'create-judge-question',
          name: 'createJudgeQuestion',
          component: () => import('../views/teacher/CreateJudgeQuestionView.vue'),
        },
        {
          path: 'edit-judge-question',
          name: 'editJudgeQuestion',
          component: () => import('../views/teacher/EditJudgeQuestionView.vue'),
        },
        // 编程题管理相关路由
        {
          path: 'program-questions',
          name: 'programQuestions',
          component: () => import('../views/teacher/ProgramQuestionView.vue'),
        },
        {
          path: 'create-program-question',
          name: 'createProgramQuestion',
          component: () => import('../views/teacher/CreateProgramQuestionView.vue'),
        },
        {
          path: 'edit-program-question',
          name: 'editProgramQuestion',
          component: () => import('../views/teacher/EditProgramQuestionView.vue'),
        },
        // 编辑考试
        {
          path: 'edit-exam/:id',
          name: 'editExam',
          component: () => import('../views/teacher/EditExamView.vue')
        },
        // 查看考试详情
        {
          path: 'exam-detail/:id',
          name: 'examDetail',
          component: () => import('../views/teacher/ExamDetailView.vue')
        },
        // 学生成绩查询
        {
          path: 'exam-result/:id',
          name: 'examResult',
          component: () => import('../views/teacher/ExamResultView.vue')
        }
      ]
    }
  ],
})

export default router
