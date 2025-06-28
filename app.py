from flask import Flask, render_template, request, jsonify, send_file
from PIL import Image
import io
import base64
import os
from werkzeug.utils import secure_filename

# Import fungsi kompresi
from compress.compress_image import compress_dct_image
from compress.compress_audio import compress_dct_audio
from compress.compress_video import compress_video_tdt

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def string_to_binary(message):
    """Konversi string ke binary"""
    return ''.join(format(ord(char), '08b') for char in message)

def binary_to_string(binary):
    """Konversi binary ke string"""
    chars = []
    for i in range(0, len(binary), 8):
        byte = binary[i:i+8]
        if len(byte) == 8:
            chars.append(chr(int(byte, 2)))
    return ''.join(chars)

def encode_message(image, message):
    """Sembunyikan pesan dalam gambar menggunakan LSB steganography"""
    # Konversi gambar ke RGB jika belum
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Tambahkan delimiter untuk menandai akhir pesan
    message += "###END###"
    binary_message = string_to_binary(message)
    
    pixels = list(image.getdata())
    
    # Cek apakah gambar cukup besar untuk menampung pesan
    if len(binary_message) > len(pixels) * 3:
        raise ValueError("Pesan terlalu panjang untuk gambar ini")
    
    data_index = 0
    new_pixels = []
    
    for pixel in pixels:
        r, g, b = pixel
        
        # Modifikasi bit terakhir dari setiap channel RGB
        if data_index < len(binary_message):
            r = (r & 0xFE) | int(binary_message[data_index])
            data_index += 1
        
        if data_index < len(binary_message):
            g = (g & 0xFE) | int(binary_message[data_index])
            data_index += 1
            
        if data_index < len(binary_message):
            b = (b & 0xFE) | int(binary_message[data_index])
            data_index += 1
            
        new_pixels.append((r, g, b))
    
    # Buat gambar baru dengan pixel yang sudah dimodifikasi
    encoded_image = Image.new('RGB', image.size)
    encoded_image.putdata(new_pixels)
    
    return encoded_image

def decode_message(image):
    """Ekstrak pesan tersembunyi dari gambar"""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    pixels = list(image.getdata())
    binary_message = ""
    
    for pixel in pixels:
        r, g, b = pixel
        
        # Ekstrak bit terakhir dari setiap channel
        binary_message += str(r & 1)
        binary_message += str(g & 1)
        binary_message += str(b & 1)
    
    # Konversi binary ke string
    message = binary_to_string(binary_message)
    
    # Cari delimiter akhir
    end_marker = "###END###"
    if end_marker in message:
        return message[:message.index(end_marker)]
    else:
        return "Tidak ada pesan tersembunyi ditemukan"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/encode', methods=['POST'])
def encode():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Tidak ada file gambar yang dipilih'}), 400
        
        file = request.files['image']
        message = request.form.get('message', '')
        
        if file.filename == '':
            return jsonify({'error': 'Tidak ada file yang dipilih'}), 400
        
        if not message:
            return jsonify({'error': 'Pesan tidak boleh kosong'}), 400
        
        if file and allowed_file(file.filename):
            # Buka gambar
            image = Image.open(file.stream)
            
            # Encode pesan
            encoded_image = encode_message(image, message)
            
            # Simpan gambar hasil encode ke memory
            img_io = io.BytesIO()
            encoded_image.save(img_io, 'PNG')
            img_io.seek(0)
            
            # Konversi ke base64 untuk dikirim ke frontend
            img_base64 = base64.b64encode(img_io.getvalue()).decode()
            
            return jsonify({
                'success': True,
                'image': img_base64,
                'message': 'Pesan berhasil disembunyikan dalam gambar'
            })
        
        return jsonify({'error': 'Format file tidak didukung'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/decode', methods=['POST'])
def decode():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Tidak ada file gambar yang dipilih'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'Tidak ada file yang dipilih'}), 400
        
        if file and allowed_file(file.filename):
            # Buka gambar
            image = Image.open(file.stream)
            
            # Decode pesan
            hidden_message = decode_message(image)
            
            return jsonify({
                'success': True,
                'message': hidden_message
            })
        
        return jsonify({'error': 'Format file tidak didukung'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# Route untuk kompresi gambar
@app.route('/compress/image', methods=['POST'])
def compress_image_route():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    cutoff_level = int(request.form.get('cutoff_level', 75))
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    result = compress_dct_image(path, cutoff_level)
    os.remove(path)
    if result is None:
        return jsonify({"error": "Image compression failed"}), 500
    return jsonify(result)

# Route untuk kompresi audio
@app.route('/compress/audio', methods=['POST'])
def compress_audio_route():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    cutoff_level = int(request.form.get('cutoff_level', 95))
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    result = compress_dct_audio(path, cutoff_level)
    os.remove(path)
    if result is None:
        return jsonify({"error": "Audio compression failed"}), 500
    return jsonify(result)

# Route untuk kompresi video
@app.route('/compress/video', methods=['POST'])
def compress_video_route():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    cutoff_level = int(request.form.get('cutoff_level', 75))
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    
    file.save(path)
    original_size = os.path.getsize(path)

    output_path = compress_video_tdt(path, cutoff_level)
    
    if output_path and os.path.exists(output_path):
        compressed_size = os.path.getsize(output_path)
        with open(output_path, 'rb') as f:
            video_bytes = f.read()
        
        base64_video = base64.b64encode(video_bytes).decode('utf-8')
        compression_ratio = 100 - ((compressed_size / original_size) * 100) if original_size > 0 else 0
        
        os.remove(output_path)
        os.remove(path)
        
        return jsonify({
            "video_base64": base64_video,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": round(compression_ratio, 2)
        })
    else:
        if os.path.exists(path):
            os.remove(path)
        return jsonify({"error": "Video compression failed. Check backend console for FFmpeg errors."}), 500

if __name__ == '__main__':
    app.run(debug=True)