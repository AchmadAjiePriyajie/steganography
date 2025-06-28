document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInputCompress");
  const qualitySlider = document.getElementById("qualitySlider");
  const sliderValueSpan = document.getElementById("sliderValue");
  const compressBtn = document.getElementById("compressBtn");
  const loading = document.getElementById("loadingCompress");
  const compressResult = document.getElementById("compressResult");
  const originalPreview = document.getElementById("originalPreview");
  const compressedPreview = document.getElementById("compressedPreview");
  const compressionInfo = document.getElementById("compressionInfo");
  const downloadBtn = document.getElementById("downloadCompressedBtn");

  sliderValueSpan.textContent = qualitySlider.value;
  qualitySlider.addEventListener("input", () => {
    sliderValueSpan.textContent = qualitySlider.value;
  });

  let selectedFileCompress = null;

  // Setup drag and drop untuk compress
  setupDragAndDrop("uploadAreaCompress", "fileInputCompress", (file) => {
    selectedFileCompress = file;
    showCompressPreview(file, "uploadAreaCompress");
  });

  // File input change handler
  document
    .getElementById("fileInputCompress")
    .addEventListener("change", function (e) {
      if (e.target.files.length > 0) {
        selectedFileCompress = e.target.files[0];
        showCompressPreview(selectedFileCompress, "uploadAreaCompress");
      }
    });

  function setupDragAndDrop(uploadAreaId, inputId, callback) {
    const uploadArea = document.getElementById(uploadAreaId);

    uploadArea.addEventListener("dragover", function (e) {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", function (e) {
      e.preventDefault();
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", function (e) {
      e.preventDefault();
      uploadArea.classList.remove("dragover");

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith("image/")) {
        callback(files[0]);
      }
    });
  }

  function showCompressPreview(file, containerId) {
    const container = document.getElementById(containerId);
    const reader = new FileReader();

    reader.onload = function (e) {
      let preview = "";
      const mime = file.type;

      if (mime.startsWith("image/")) {
        preview = `<img src="${e.target.result}" class="preview-image mb-3" alt="Preview">`;
      } else if (mime.startsWith("audio/")) {
        preview = `<audio controls class="w-100 mb-3"><source src="${e.target.result}" type="${mime}"></audio>`;
      } else if (mime.startsWith("video/")) {
        preview = `<video controls class="w-100 mb-3" style="max-height: 300px;"><source src="${e.target.result}" type="${mime}"></video>`;
      } else {
        preview = `<p class="text-danger">Preview tidak tersedia untuk tipe file ini</p>`;
      }

      container.innerHTML = `
      ${preview}
      <p class="text-success"><i class="fas fa-check me-2"></i>${file.name}</p>
      <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetUpload('${containerId}', 'fileInputCompress')">
          <i class="fas fa-times me-1"></i>Ganti File
      </button>
    `;
    };

    reader.readAsDataURL(file);
  }

  function resetUpload(containerId, inputId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    input.value = "";
    container.innerHTML = `
    <i class="fas fa-file-upload fa-3x text-muted mb-3"></i>
    <p class="mb-3">Drag & drop file di sini atau klik untuk memilih</p>
    <input type="file" id="${inputId}" class="d-none" accept="image/*,audio/*,video/*">
    <button type="button" class="btn btn-custom" onclick="document.getElementById('${inputId}').click()">
      Pilih File
    </button>
  `;
  }

  compressBtn.addEventListener("click", async () => {
    const file = selectedFileCompress;
    if (!file) return alert("Silakan pilih file terlebih dahulu.");

    const fileType = file.type.split("/")[0];
    if (!["image", "audio", "video"].includes(fileType)) {
      return alert("Pilih file bertipe image, audio, atau video.");
    }

    compressBtn.disabled = true;
    loading.style.display = "block";
    compressResult.style.display = "none";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("cutoff_level", qualitySlider.value);

    try {
      const response = await fetch(`/compress/${fileType}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Gagal mengompresi file.");

      const data = await response.json();

      const originalUrl = URL.createObjectURL(file);
      let compressedUrl;

      if (fileType === "image") {
        compressedUrl = `data:image/jpeg;base64,${data.image_base64}`;
        originalPreview.innerHTML = `<img src="${originalUrl}" alt="Original" class="img-fluid">`;
        compressedPreview.innerHTML = `<img src="${compressedUrl}" alt="Compressed" class="img-fluid">`;
        downloadBtn.download = "compressed_image.jpg";
      } else if (fileType === "audio") {
        compressedUrl = `data:audio/wav;base64,${data.audio_base64}`;
        originalPreview.innerHTML = `<audio src="${originalUrl}" controls></audio>`;
        compressedPreview.innerHTML = `<audio src="${compressedUrl}" controls></audio>`;
        downloadBtn.download = "compressed_audio.wav";
      } else if (fileType === "video") {
        compressedUrl = `data:video/mp4;base64,${data.video_base64}`;
        originalPreview.innerHTML = `<video src="${originalUrl}" controls class="w-100"></video>`;
        compressedPreview.innerHTML = `<video src="${compressedUrl}" controls class="w-100"></video>`;
        downloadBtn.download = "compressed_video.mp4";
      }

      compressionInfo.textContent = `Ukuran asli: ${formatBytes(
        data.original_size
      )}, setelah kompresi: ${formatBytes(data.compressed_size)} (↓${
        data.compression_ratio
      }%)`;
      downloadBtn.href = compressedUrl;
      compressResult.style.display = "block";

      setTimeout(() => URL.revokeObjectURL(originalUrl), 1500);
    } catch (err) {
      alert(err.message);
    } finally {
      compressBtn.disabled = false;
      loading.style.display = "none";
    }
  });

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
});
