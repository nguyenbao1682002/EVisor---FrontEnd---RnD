import { computed, ref } from "vue";
import { useAuthStore } from "../../../stores/auth";
import { createInstallationDataWarehouseApi } from "../../../services/auth.service";
import { ElMessage } from "element-plus";

export function useWarehouseInstallationPartAction(langStore, fetchDataAndInitialize) {
    const dialogVisible = ref(false);
    const currentItem = ref(null);
    const authStore = useAuthStore();
    const loggedInUserId = authStore.user?.id;
    const originalItemData = ref(null);

    const newItem = ref(null);
    const newItemDialogVisible = ref(false);

    const isDeleteting = ref(false);
    const selectedItems = ref([]);
    const itemSelectionChange = (selection) => {
        selectedItems.value = selection;
    };

    const selectionEmpty = computed(() => selectedItems.value.length === 0);
    const isEditing = ref(false);

    const getInitialItemData = () => ({
        id: '',
        location: '',
        dt: '',
        quantity: 1,
        description: '',
        part_no: '',
        manufacturer: '',
        project_code: '',
        cabinet_no: '',
        status: 0,
        higher_level_function: ''
    });

    const addNewItem = () => {
        newItem.value = getInitialItemData();
        originalItemData.value = null;
        isEditing.value = false;
        newItemDialogVisible.value = true;
    };

    const createItem = async (itemData) => {
        const payload = {
            "request_id": `evisor-${Date.now()}`,
            'owner': loggedInUserId,
            'dml_action': 'insert',
            form: {
                "location": itemData.location || null,
                "dt": itemData.dt || null,
                "quantity": itemData.quantity || 1,
                "description": itemData.description || null,
                "part_no": itemData.part_no || null,
                "seri_number": itemData.seri_number || '',
                "manufacturer": itemData.manufacturer || null,
                "project_code": itemData.project_code || null,  
                "cabinet_no": itemData.cabinet_no || null,
                "status": itemData.status || 0,
                "higher_level_function": itemData.higher_level_function || null
            },
        };

        try {
            await createInstallationDataWarehouseApi(payload);
            const successMessage = langStore.t('InsertInfoSuccess') || 'Thêm sản phẩm mới thành công!';
            ElMessage.success(successMessage);
            if (fetchDataAndInitialize) {
                fetchDataAndInitialize();
            }
        } catch (err) {
            const errorMessage = (langStore.t('ErrorOccurredWhenInserted') || 'Đã xảy ra lỗi khi thêm mới') + `: ${err.message}`;
            ElMessage.error(errorMessage);
        } finally {
            newItemDialogVisible.value = false;
            newItem.value = null;
        }
    };

    const editItem = (item) => {
        currentItem.value = JSON.parse(JSON.stringify(item));
        originalItemData.value = JSON.parse(JSON.stringify(item));
        dialogVisible.value = true;
    };

    return {
        dialogVisible,
        currentItem,
        loggedInUserId,
        originalItemData,
        newItem,
        newItemDialogVisible,
        isDeleteting,
        selectedItems,
        itemSelectionChange,
        selectionEmpty,
        isEditing,
        getInitialItemData,
        addNewItem,
        createItem,
        editItem,
    }
}