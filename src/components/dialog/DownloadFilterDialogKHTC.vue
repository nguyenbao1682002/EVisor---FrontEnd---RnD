<template>
    <el-dialog
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="langstore.t('DownloadOptionsTitle')"
        width="500px"
        center
        :close-on-click-model="false"
    >
        <el-form label-width="120px">
            <el-form-item label="Version">
                <el-select
                    v-model="versionVal"
                    placeholder="Lọc theo version"
                    clearable
                    class="status-select"
                    style="width: 50%;"
                >
                    <el-option
                        v-for="version in uniqueVersion"
                        :key="version.id"
                        :label="version.name"
                        :value="version.id"
                    ></el-option>
                </el-select>
            </el-form-item>
        </el-form>

        <div style="text-align: center; margin-top: 20px;">
            <el-button
                type="primary"
                :icon="Download"
                :loading="isPreparing"
                v-on:click="handleDownload"
            >
                {{ isPreparing ? langstore.t('PreparingDownloadLink') : langstore.t('GetDownloadLinkButton') }}
            </el-button>
        </div>

        <el-alert
            v-if="downloadUrl"
            :title="langstore.t('DownloadLinkReadyTitle')"
            type="success"
            center
            show-icon
            style="margin-top: 20px;"
        >
            <p>{{ langstore.t('FileLabel') }}<span style="font-weight: bold;">{{ fileName }}</span></p>
            <p>URL: <a :href="downloadUrl" target="_blank" style="word-break: break-all;">{{ downloadUrl }}</a></p>
            <el-button
                type="success"
                :icon="Download"
                v-on:click="$emit('confirmDownload')"
                style="margin-top: 10px;"
            >
                {{ langstore.t('DownloadDocumentButton') }}
            </el-button>
        </el-alert>
    </el-dialog>
</template>

<script>
import { Download } from '@element-plus/icons-vue';
import { ref, watch } from 'vue';
import { useLanguageStore } from '../../stores/language';
import { useTaskData } from '../../composables/KHTC/useTaskData';

export default {
    name: 'DownloadFilterDialog',
    props: {
        modelValue: {
            type: Boolean,
            default: false
        },
        downloadUrl: String,
        fileName: String,
        isPreparing: Boolean,
    },
    emits: ['update:modelValue', 'confirmDownload', 'createDownloadLink'],
    setup(props, {emit}) {

        const{ 
            uniqueVersion, 
            applyFilters,
        } = useTaskData();
        
        const versionVal = ref('');

        const langStore = useLanguageStore();
        // Reset form while dialog close/open
        watch(() => props.modelValue, (newVal) => {
            if (!newVal) {
                // Reset form while close
                versionVal.value = '';
            }
        });

        const handleDownload = () =>{
            // Emit event with filterData to parent component call API
            emit('createDownloadLink', versionVal.value);
        }
        
        return {
            Download,
            versionVal,
            handleDownload,
            langstore: langStore,
            uniqueVersion,
            applyFilters,
        }
    }
}
</script>