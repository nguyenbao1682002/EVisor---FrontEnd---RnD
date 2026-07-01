import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore } from '../../stores/auth';
import { actionFormWorkManagementKHTCApi } from '../../services/auth.service';
import { useLoadWorkManagementKHTC } from './useLoadWorkManagementKHTC';
import { writeWorkManagementLogApi } from '../../services/auth.service';

export function useTaskActions(allTasks, paginatedTasks, dummyTasks, langStore, fetchDataAndInitialize) {
  const { viewModeSwitch, buttonStatus } = useLoadWorkManagementKHTC();
  
  const dialogVisible = ref(false);
  const currentTask = ref(null);
  const authStore = useAuthStore();
  const loggedInUserId = authStore.user?.id;
  const originalTaskData = ref(null); // Variable to save the original data
  const loggedInUserRole = authStore.role?.id;
  
  const getStatusTagType = (status) => {
    switch (status) {
      case 0:
        return 'info';
      case 1:
        return 'primary';
      case 2:
        return 'warning';
      case 3:
        return 'success';
      case 4:
        return 'danger';
      default:
        return 'info';
    }
  };

  const getSiteTagType = (site => {
    switch (site) {
      case 'S':
        return 'success';
      case 'V':
        return 'danger';
      default:
        return 'info';
    }
  });

  const getTranslatedStatusLabel = (statusValue, taskStatuses) => {
    const status = taskStatuses.find(s => s.value === statusValue);
    return status ? status.label : statusValue;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const addTask = () => {
    currentTask.value = {
      task_id: '',
      full_name: '',
      project_code: '',
      description: '',
      start_date: '',
      end_date: '',
      QTY: 0,
      status: '-- Chọn trạng thái --',
    };
    dialogVisible.value = true;
  };

  const editTask = (task) => {
    currentTask.value = JSON.parse(JSON.stringify(task));
    originalTaskData.value = JSON.parse(JSON.stringify(task)); // Save the original copy
    dialogVisible.value = true;
  };

  const saveTask = async (taskData, isEditingMode) => {
    const selectedAssignee = dummyTasks.value.find(user => user.id === taskData.full_name);
    if (selectedAssignee) {
      taskData.full_name = selectedAssignee.name;
    }
    const dmlAction = isEditingMode ? "update" : "insert";
    const taskIdForPayload = isEditingMode && taskData.task_id != null ? [taskData.task_id] : null;
    // Compare data to create payload
    const payload = {
      "request_id": `evisor-${Date.now()}`,
      'owner': loggedInUserId,
      'dml_action': dmlAction,
      form: {
        "id": taskIdForPayload,
        "owner": loggedInUserId,
        "full_name": taskData.full_name || '',
        "project_code": taskData.project_code || '',
        "description": taskData.description || '',
        "start_date": taskData.start_date || '',
        "end_date": taskData.end_date || '',
        "QTY": taskData.QTY || 0,
        "site": taskData.site || '',
        "status": taskData.status || 0
      }
    };

    try {
      const response = await actionFormWorkManagementKHTCApi(payload);
      if (response.data.status === 'success') {
        
        const isEdit = isEditingMode; 
        let taskIdLog = "";

        if (isEdit) {
          // Trường hợp CẬP NHẬT: Lấy ID từ dữ liệu form đang sửa (taskData)
          taskIdLog = String(taskData.task_id || currentTask.value?.task_id || "");
        } else {
          // Trường hợp TẠO MỚI: bóc tách ID tự động sinh ra từ cơ sở dữ liệu backend trả về
          // Thêm trường hợp bóc tách response.data?.id (nếu backend đặt tên cột là id)
          taskIdLog = String(
            response.data?.task_id || 
            response.data?.data?.task_id || 
            response.data?.id || 
            response.data?.data?.id || 
            "NEW_TASK"
          );
        }
        await writeWorkManagementLogApi({
            task_id: taskIdLog, 
            user_id: loggedInUserId ? String(loggedInUserId) : "Unknown",
            user_name: authStore.user?.name || "Unknown",
            action_type: isEdit ? "UPDATE" : "CREATE",
            function_name: "WorkManagement_KHTC_Actions",
            description: isEdit 
                ? `Người dùng cập nhật công việc có mã CV là: ${taskIdLog}` 
                : `Người dùng tạo mới công việc thành công ! Mã CV: ${taskIdLog}`,
            metadata: payload // Map data form gửi lên vào trường metadata
        });

        ElMessage.success(isEdit ? langStore.t('EditSuccess') : langStore.t('AddSuccess'));
        closeDialog();
        if (fetchDataAndInitialize) fetchDataAndInitialize();
      }
    } catch (err) {
      const errorMessage = isEditingMode
        ? langStore.t('ErrorOccurredWhenUpdated') + ` ${err.message}`
        : langStore.t('ErrorOccurredWhenInserted') + ` ${err.message}`
      ElMessage.error(errorMessage)
    } finally {
      dialogVisible.value = false;
    }

    // if (isEditingMode) {
    //   const index = allTasks.value.findIndex((t) => t.task_id === taskData.task_id);
    //   if (index !== -1) {
    //     allTasks.value[index] = { ...taskData };
    //     ElMessage.success("Cập nhật công việc thành công!");
    //   }
    // } else {
    //   const newTaskId = Math.max(0, ...allTasks.value.map(t => parseInt(t.task_id) || 0)) + 1;
    //   taskData.task_id = newTaskId.toString();
    //   allTasks.value.push({ ...taskData });
    //   ElMessage.success(langStore.t('AddWorkloadSuccess'));
    // }
    // dialogVisible.value = false;
  };

  const confirmDeleteTask = (task) => {
    ElMessageBox.confirm(
      langStore.t('ConfirmDeleteWorkload') + ` ${task.task_id}` + ' ?',
      langStore.t('ConfirmDelete'),
      {
        confirmButtonText: langStore.t('DeleteAct'),
        cancelButtonText: langStore.t('DestroyAct'),
        type: "warning",
      }
    )
      .then(async () => {
        const payload = {
          "request_id": `evisor-${Date.now()}`,
          'owner': loggedInUserId,
          'dml_action': "delete",
          form: {
            "id": [task.task_id],
            "owner": task.owner || '',
            "full_name": task.full_name || '',
            "project_code": task.project_code || '',
            "description": task.description || '',
            "start_date": task.start_date || '',
            "end_date": task.end_date || '',
            "QTY": task.QTY || 0,
            "site": task.site || '',
            "status": task.status || 0
          }
        };

        try {
          await actionFormWorkManagementKHTCApi(payload);

            await writeWorkManagementLogApi({
            task_id: String(task.task_id), 
            user_id: loggedInUserId ? String(loggedInUserId) : "Unknown",
            user_name: authStore.user?.name || "Unknown",
            action_type: "DELETE",
            function_name: "WorkManagement_KHTC_Actions",
            description: `Xóa đơn lẻ công việc có mã ID: ${task.task_id}`,
            metadata: task // Truyền toàn bộ object task làm dữ liệu lịch sử cũ
          });
          allTasks.value = allTasks.value.filter((t) => t.task_id !== task.task_id);
          ElMessage({
            type: "success",
            message: langStore.t('DeleteWorkloadSuccess'),
          });
          if (fetchDataAndInitialize) {
            fetchDataAndInitialize();
          }
          // Kiểm tra lại trang hiện tại nếu xóa hết task trên trang đó
          if (paginatedTasks.value.length === 0 && paginatedTasks.currentPage > 1) { // Lưu ý: paginatedTasks cần có currentPage nếu muốn dùng ở đây
              // Ở đây bạn cần truyền currentPage từ useTaskData hoặc tìm cách khác để cập nhật
              // Để đơn giản, tôi sẽ giả định rằng việc xóa sẽ tự động re-render và xử lý phân trang
              // Một cách tốt hơn là truyền hàm handleCurrentChange từ useTaskData vào đây
          }
        } catch (error) {
          ElMessage.error(langStore.t('ErrorOccurredWhenDeleted') + ` ${error.message}`);
        }
      })
      .catch(() => {
        ElMessage({
          type: "info",
          message: langStore.t('CancelDelete'),
        });
      });
  };

  const closeDialog = () => {
    currentTask.value = null;
    dialogVisible.value = false;
  };

  return {
    dialogVisible,
    currentTask,
    getStatusTagType,
    getTranslatedStatusLabel,
    formatDate,
    addTask,
    editTask,
    saveTask,
    confirmDeleteTask,
    closeDialog,
    loggedInUserId,
    originalTaskData,
    getSiteTagType,
    loggedInUserRole,
    buttonStatus,
    viewModeSwitch,
  };
}