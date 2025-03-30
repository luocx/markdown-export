<template>
  <div class="container">
    <!-- 工具栏 -->
    <el-row class="toolbar" justify="start" :gutter="20">
      <el-button
        @click="exportHTML"
        :loading="isLoading"
        type="primary"
        size="default"
        :disabled="isLoading"
        >导出HTML</el-button
      >
      <el-button
        @click="exportPDF"
        :loading="isLoading"
        type="primary"
        size="default"
        :disabled="isLoading"
        >导出PDF</el-button
      >
      <el-button
        @click="exportImage"
        :loading="isLoading"
        type="primary"
        size="default"
        :disabled="isLoading"
        >导出图片</el-button
      >
    </el-row>

    <!-- 内容区域 -->
    <el-row class="content">
      <!-- 编辑区 -->
      <el-col :span="24" :md="12">
        <div
          class="editor"
          ref="editor"
          @scroll="syncScroll($event, 'editor')"
          style="height: 100%; min-height: 500px"
        >
          <div id="vditor"></div>
        </div>
      </el-col>

      <!-- 预览区 -->
      <el-col :span="24" :md="12">
        <div
          class="preview"
          ref="preview"
          @scroll="syncScroll($event, 'preview')"
        >
          <div v-html="this.htmlContent" style="padding: 0 20px"></div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
// eslint-disable-next-line no-unused-vars
import Vditor from "vditor";
import "vditor/dist/index.css"; // 引入 Vditor 样式
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import markdownit from "markdown-it";
import { ElButton, ElRow, ElCol } from "element-plus"; // 引入 Element-Plus 组件

export default {
  components: {
    ElButton,
    ElRow,
    ElCol,
  },
  data() {
    return {
      vditor: null,
      htmlContent: "",
      previewElement: null,
      md: new markdownit({
        html: true,
        linkify: true,
        breaks: true,
        typographer: true,
      }),
      isLoading: false,
    };
  },
  mounted() {
    // 初始化 Vditor 编辑器
    this.vditor = new Vditor("vditor", {
      height: "auto",
      minHeight: 500,
      placeholder: "请输入Markdown内容...",
      cache: false,
      mode: "sv",
      //theme: "dark",
      cdn: "https://cdn.jsdelivr.net/npm/vditor@3.10.8",
      preview: { mode: "editor", markdown: {} },
      toolbar: [],
      after: () => {
        this.htmlContent = this.md.render(this.vditor.getValue());
      },
      input: () => {
        this.htmlContent = this.md.render(this.vditor.getValue());
      },
    });
    this.previewElement = this.$refs.preview.childNodes[0];
  },
  watch: {},
  methods: {
    syncScroll(event, source) {
      const editor = this.$refs.editor;
      const preview = this.$refs.preview;
      if (source === "editor") {
        preview.scrollTop = editor.scrollTop;
      } else if (source === "preview") {
        editor.scrollTop = preview.scrollTop;
      }
    },
    /**
     * 获取父元素内部指定高度范围内的子元素
     * @param {HTMLElement} container 父元素（基准容器）
     * @param {number} rangeEnd 相对于父元素顶部的高度范围终点
     * @param {number} [rangeStart=0] 相对于父元素顶部的高度范围起点（默认0）
     * @returns {HTMLElement[]} 符合条件的元素数组
     */
    getElementsUnderHeight(container, rangeEnd, rangeStart = 0) {
      const elements = [];

      // 获取父元素的文档位置和尺寸
      const containerRect = container.getBoundingClientRect();
      // const containerTop = containerRect.top + window.scrollY;

      // 遍历父元素的所有子元素（包括深层嵌套）
      const allElements = container.querySelectorAll("*");

      for (const element of allElements) {
        // 过滤不可见元素
        const style = window.getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        ) {
          continue;
        }

        // 计算元素相对于父容器的位置
        const elementRect = element.getBoundingClientRect();
        const relativeTop =
          elementRect.top - containerRect.top + container.scrollTop;
        const relativeBottom = relativeTop + elementRect.height;

        // 判断是否完全在范围内
        if (relativeTop >= rangeStart && relativeBottom <= rangeEnd) {
          elements.push(element);
        }
      }

      return elements.sort((a, b) =>
        a.compareDocumentPosition(b) === 2 ? 1 : -1
      );
    },
    calcOffsetHeight(rootEl, head, foot) {
      var elements = this.getElementsUnderHeight(rootEl, foot, head);
      if (elements.length == 0) {
        return 0;
      }
      const containerRect = rootEl.getBoundingClientRect();
      // 计算元素相对于父容器的位置
      const elementRect = elements[elements.length - 1].getBoundingClientRect();
      const relativeTop =
        elementRect.top - containerRect.top + rootEl.scrollTop;
      return Math.max(0, foot - relativeTop - elementRect.height);
    },
    // 导出 HTML
    exportHTML() {
      this.isLoading = true;
      const blob = new Blob([this.htmlContent], { type: "text/html" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "document.html";
      link.click();
      this.isLoading = false;
    },
    // 像素转毫米
    pxToMm(px) {
      const dpi = window.devicePixelRatio * 96;
      return (px * 25.4) / dpi;
    },
    // 毫米转像素
    mmToPx(mm) {
      // 获取屏幕DPI
      const dpi = window.devicePixelRatio * 96;
      return (mm * dpi) / 25.4;
    },
    // 导出PDF
    async exportPDF() {
      const element = this.previewElement;
      const A4_WIDTH = 210; // 210mm
      const A4_HEIGHT = 297; // 297mm
      const A4_WIDTH_PX = this.mmToPx(A4_WIDTH);
      const A4_HEIGHT_PX = this.mmToPx(A4_HEIGHT);

      try {
        this.isLoading = true;
        const scale = 2;

        // 生成画布
        const canvas = await html2canvas(element, {
          scale,
          useCORS: true,
          imageTimeout: 150,
          logging: true,
        });

        const { width: imgWidth, height: imgHeight } = canvas;
        const ratio = imgWidth / A4_WIDTH_PX;
        const a4ImgPageHeight = A4_HEIGHT_PX * ratio;

        // 创建PDF实例
        const pdf = new jsPDF({
          orientation: "p",
          unit: "mm",
          format: "a4",
          putOnlyUsedFonts: true,
          floatPrecision: 16,
        });

        // 根据内容高度判断是单页还是多页处理
        if (imgHeight <= a4ImgPageHeight) {
          // 单页处理
          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(
            imgData,
            "PNG",
            0,
            0,
            A4_WIDTH,
            A4_HEIGHT - this.pxToMm(a4ImgPageHeight - imgHeight)
          );
        } else {
          // 多页处理
          let imgLeftHeight = imgHeight;
          let imgPosition = 0;
          while (imgLeftHeight > 0) {
            // 创建裁剪画布
            const cropCanvas = document.createElement("canvas");
            const cropContext = cropCanvas.getContext("2d");

            // 计算偏移量，防止分页时元素从中间截断
            const offset =
              imgLeftHeight < a4ImgPageHeight
                ? 0
                : Math.ceil(
                    this.calcOffsetHeight(
                      element,
                      (imgHeight - imgLeftHeight) / scale,
                      Math.floor(
                        (imgHeight - imgLeftHeight + a4ImgPageHeight) / scale
                      )
                    ) * scale
                  );

            cropCanvas.width = canvas.width;
            cropCanvas.height = a4ImgPageHeight - offset;

            // 绘制裁剪内容
            cropContext.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            cropContext.drawImage(
              canvas,
              0,
              imgPosition,
              canvas.width,
              cropCanvas.height,
              0,
              0,
              canvas.width,
              cropCanvas.height
            );

            // 验证画布内容
            if (cropCanvas.width === 0 || cropCanvas.height === 0) {
              console.warn("当前裁剪区域为空，跳过此页");
              break;
            }

            const croppedImgData = cropCanvas.toDataURL("image/png");
            if (!croppedImgData) {
              console.warn("裁剪图像数据为空，跳过此页");
              continue;
            }

            // 添加图片到PDF
            pdf.addImage(
              croppedImgData,
              "PNG",
              0,
              0,
              A4_WIDTH,
              A4_HEIGHT - this.pxToMm(offset / ratio),
              undefined,
              "FAST"
            );

            imgLeftHeight -= cropCanvas.height;
            imgPosition += cropCanvas.height;
            if (imgLeftHeight > 0 && imgPosition < imgHeight) {
              console.log(imgLeftHeight, imgPosition, offset);
              pdf.addPage();
            }
          }
        }

        pdf.save("exported.pdf");
      } catch (error) {
        console.error("导出PDF失败:", error);
      } finally {
        this.isLoading = false;
      }
    },
    // 导出图片
    exportImage() {
      this.isLoading = true;
      let element = this.previewElement;
      html2canvas(element, {
        useCORS: true, // 启用跨域资源加载
        logging: true, // 启用调试日志
        backgroundColor: "#FFF",
        scale: 1.5,
        width: element.scrollWidth,
        height: element.scrollHeight,
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "document.png";
        link.click();
        this.isLoading = false;
      });
    },
  },
};
</script>
<style scoped>
.container {
  display: flex;
  flex-direction: column;
  width: 70%;
  margin: 0 auto;
}

.toolbar {
  margin-bottom: 10px;
}

.content {
  display: flex;
  justify-content: space-between;
  gap: 0; /* 删除 gap，确保编辑区和预览区没有间隔 */
}

.editor,
.preview {
  background-color: #f7f7f7;
  border-radius: 0px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  height: 100%;
  overflow-y: auto;
  max-height: calc(100vh - 100px); /* 限制最大高度 */
  min-width: 500px;
}

.editor {
  width: 100%;
}

.preview {
  width: 100%;
  background-color: #fff;
  overflow: auto;
}

.editor h2,
.preview h2 {
  text-align: center;
  font-size: 1.2em;
  color: #333;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .content {
    flex-direction: column;
  }

  .editor,
  .preview {
    width: 100%;
    margin-bottom: 20px; /* 添加底部间隔 */
  }
}
</style>
