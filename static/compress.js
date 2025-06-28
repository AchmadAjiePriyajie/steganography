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

  compressBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
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
