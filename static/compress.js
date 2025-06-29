const qualitySlider = document.getElementById("qualitySlider");
const sliderValueSpan = document.getElementById("sliderValue");
const compressBtn = document.getElementById("compressBtn");
const compressResult = document.getElementById("compressResult");
const compressedPreview = document.getElementById("compressedPreview");
const compressionInfo = document.getElementById("compressionInfo");
const downloadBtn = document.getElementById("downloadCompressedBtn");

sliderValueSpan.textContent = qualitySlider.value;
qualitySlider.addEventListener("input", () => {
  sliderValueSpan.textContent = qualitySlider.value;
});

let selectedFileCompress = null;

// Setup drag and drop untuk compress
setupDragAndDrop("uploadAreaCompress", ["image", "audio", "video"], (file) => {
  selectedFileCompress = file;
  showCompressPreview(file, "uploadAreaCompress");
});

// File input change handler
document.addEventListener("change", function (e) {
  if (e.target.id == 'fileInputCompress' && e.target.files.length > 0) {
    selectedFileCompress = e.target.files[0];
    showCompressPreview(selectedFileCompress, "uploadAreaCompress");
  }
});

function showCompressPreview(file, containerId) {
  const container = document.getElementById(containerId);
  const reader = new FileReader();

  reader.onload = function (e) {
    let preview = "";
    const mime = file.type;

    if (mime.startsWith("image/")) {
      preview = `<img src="${e.target.result}" class="preview-image mb-3" alt="Preview">`;
    } else if (mime.startsWith("audio/")) {
      preview = `<div id="wsOriginal"></div>`;
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
    if (mime.startsWith("audio/"))
      initWavesurfer('#wsOriginal', e.target.result, '#667eea', '#0061f3')
  };

  reader.readAsDataURL(file);
}

const content = compressBtn.innerHTML;
compressBtn.addEventListener("click", async () => {
  const file = selectedFileCompress;
  if (!file) return toastr.warning("Silakan pilih file terlebih dahulu.");

  const fileType = file.type.split("/")[0];
  if (!["image", "audio", "video"].includes(fileType)) {
    return toastr.warning("Pilih file bertipe image, audio, atau video.");
  }

  compressBtn.innerHTML = `<i class="fas fa-spin fa-spinner me-2"></i> Memproses kompresi...`;
  compressBtn.disabled = true;
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

    const compressedUrl = `data:${file.type};base64,${data[fileType + '_base64']}`;

    if (fileType === "image") {
      compressedPreview.innerHTML = `<img src="${compressedUrl}" alt="Compressed" class="img-fluid">`;
      downloadBtn.download = "compressed_image.jpg";
    } else if (fileType === "audio") {
      compressedPreview.innerHTML = `<div id="wsCompressed"></div`;
      initWavesurfer('#wsCompressed', compressedUrl, '#764ba2', '#0061f3')
      downloadBtn.download = "compressed_audio.wav";
    } else if (fileType === "video") {
      compressedPreview.innerHTML = `<video src="${compressedUrl}" controls class="w-100"></video>`;
      downloadBtn.download = "compressed_video.mp4";
    }

    compressionInfo.textContent = `Ukuran asli: ${formatBytes(data.original_size)},
     setelah kompresi: ${formatBytes(data.compressed_size)} (↓${data.compression_ratio}%)`;
    downloadBtn.href = compressedUrl;
    compressResult.style.display = "block";
  } catch (err) {
    toastr.error(err.message);
  } finally {
    compressBtn.innerHTML = content;
    compressBtn.disabled = false;
  }
});

function initWavesurfer(container, url, waveColor, progressColor) {
  WaveSurfer.create({
    container,
    waveColor,
    progressColor,
    height: 100,
    responsive: true,
    backend: 'MediaElement',
    mediaControls: true,
  }).load(url)
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}