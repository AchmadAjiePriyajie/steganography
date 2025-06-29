let selectedImageEncode = null;
let selectedImageDecode = null;

const downloadEncodedBtn = document.getElementById("downloadEncodedBtn");

// Setup drag and drop untuk encode
setupDragAndDrop("uploadAreaEncode", ["image"], (file) => {
    selectedImageEncode = file;
    showImagePreview(file, "uploadAreaEncode");
});

// Setup drag and drop untuk decode
setupDragAndDrop("uploadAreaDecode", ["image"], (file) => {
    selectedImageDecode = file;
    showImagePreview(file, "uploadAreaDecode");
});

// File input change handlers
document.addEventListener("change", function (e) {
    if (e.target.files.length < 1) return;
    if (e.target.id == 'imageInputEncode') {
        selectedImageEncode = e.target.files[0];
        showImagePreview(selectedImageEncode, "uploadAreaEncode");
    }
    if (e.target.id == 'imageInputDecode') {
        selectedImageDecode = e.target.files[0];
        showImagePreview(selectedImageDecode, "uploadAreaDecode");
    }
});

// Encode button handler
document
    .getElementById("encodeBtn")
    .addEventListener("click", async function () {
        const message = document.getElementById("messageInput").value.trim();

        if (!selectedImageEncode) {
            toastr.warning("Silakan pilih gambar terlebih dahulu!");
            return;
        }

        if (!message) {
            toastr.warning("Silakan masukkan pesan yang ingin disembunyikan!");
            return;
        }

        const content = this.innerHTML;
        this.disabled = true;
        this.innerHTML = `<i class="fas fa-spin fa-spinner me-2"></i> Memproses gambar...`;

        await encodeMessage();

        this.disabled = false;
        this.innerHTML = content;
    });

// Decode button handler
document
    .getElementById("decodeBtn")
    .addEventListener("click", async function () {
        if (!selectedImageDecode) {
            toastr.warning("Silakan pilih gambar terlebih dahulu!");
            return;
        }

        const content = this.innerHTML;
        this.disabled = true;
        this.innerHTML = `<i class="fas fa-spin fa-spinner me-2"></i> Mengekstrak pesan...`

        await decodeMessage();

        this.disabled = false;
        this.innerHTML = content
    });

// Copy button handler
document.getElementById("copyBtn").addEventListener("click", function () {
    const messageText = document.getElementById("decodedMessage").value;
    navigator.clipboard.writeText(messageText).then(() => {
        toastr.success("Pesan berhasil disalin ke clipboard!");
    });
});

function setupDragAndDrop(uploadAreaId, types, callback) {
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
        if (files.length > 0 && types.includes(files[0].type.substring(0, 5))) {
            callback(files[0]);
        }
    });
}

function showImagePreview(file, containerId) {
    const container = document.getElementById(containerId);
    const reader = new FileReader();

    reader.onload = function (e) {
        container.innerHTML = `
                    <img src="${e.target.result
            }" class="preview-image mb-3" alt="Preview">
                    <p class="text-success"><i class="fas fa-check me-2"></i>${file.name
            }</p>
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetUpload('${containerId}', '${containerId === "uploadAreaEncode"
                ? "imageInputEncode"
                : "imageInputDecode"
            }')">
                        <i class="fas fa-times me-1"></i>Ganti Gambar
                    </button>
                `;
    };

    reader.readAsDataURL(file);
}

function resetUpload(containerId, inputId) {
    const container = document.getElementById(containerId);

    if (containerId === "uploadAreaEncode") {
        selectedImageEncode = null;
    } else if (containerId == "uploadAreaDecode") {
        selectedImageDecode = null;
    } else {
        selectedFileCompress = null;
    }

    let uploadArea = {
        uploadAreaEncode: ['cloud-upload-alt', 'Drag & drop gambar di sini atau klik untuk memilih'],
        uploadAreaDecode: ['image', 'Drag & drop gambar yang berisi pesan tersembunyi'],
        uploadAreaCompress: ['file-upload', 'Drag & drop file di sini atau klik untuk memilih']
    }

    container.innerHTML = `
        <i class="fas fa-${uploadArea[containerId][0]} fa-3x text-muted mb-3"></i>
        <p class="mb-3">${uploadArea[containerId][1]}</p>
        <input
            type="file"
            id="${inputId}"
            accept="${inputId == 'fileInputCompress' ? 'image/*,audio/*,video/*' : 'image/*'}"
            class="d-none"
        />
        <button type="button" class="btn btn-custom" onclick="document.getElementById('${inputId}').click()">
            Pilih ${inputId == 'fileInputCompress' ? 'File' : 'Gambar'}
        </button>
    `;
}

async function encodeMessage() {
    const formData = new FormData();
    formData.append("image", selectedImageEncode);
    formData.append(
        "message",
        document.getElementById("messageInput").value
    );

    document.getElementById("encodeResult").style.display = "none";

    try {
        const response = await fetch("/encode", {
            method: "POST",
            body: formData,
        })

        const data = await response.json()
        if (!data.success) return toastr.error(data.error);

        document.getElementById("encodeResult").style.display = "block";
        document.getElementById("encodedImage").src = `data:${selectedImageEncode.type};base64,${data.image}`;

        // Setup download button
        downloadEncodedBtn.download = selectedImageEncode.name;
        downloadEncodedBtn.href = `data:${selectedImageEncode.type};base64,${data.image}`;
        downloadEncodedBtn.onclick = () => setTimeout(() => URL.revokeObjectURL(downloadEncodedBtn.href), 1000);

        toastr.success(data.message);
    } catch (error) {
        toastr.error("Terjadi kesalahan saat memproses gambar: " + error.message);
    }
}

async function decodeMessage() {
    const formData = new FormData();
    formData.append("image", selectedImageDecode);

    document.getElementById("decodeResult").style.display = "none";

    try {
        const response = await fetch("/decode", {
            method: "POST",
            body: formData,
        })
        const data = await response.json()
        if (!data.success) return toastr.error(data.error);

        document.getElementById("decodeResult").style.display = "block";
        document.getElementById("decodedMessage").value = data.message;

        if (data.message === "Tidak ada pesan tersembunyi ditemukan") {
            toastr.info("Tidak ada pesan tersembunyi yang ditemukan dalam gambar ini.");
        } else {
            toastr.success("Pesan berhasil diekstrak dari gambar!");
        }
    } catch (error) {
        toastr.error("Terjadi kesalahan saat memproses gambar: " + error.message);
    }
}
