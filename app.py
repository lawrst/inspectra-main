from flask import Flask, request, render_template, send_file, Response, jsonify
from werkzeug.utils import secure_filename
import io
from ultralytics import YOLO
import numpy as np
from PIL import Image
import cv2
import os
from datetime import datetime
import logging
from pymongo import MongoClient
from bson.json_util import dumps
from flask_cors import CORS
from bson import ObjectId
import base64
import json

app = Flask(__name__, template_folder=r'C:\Users\Mariana\Documents\project\inspectra-main\Object-Detection-Yolo-Flask-main-v3\templates')

CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads/'

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONGO_URI = 'mongodb+srv://userDB:diva739GJçq@formulario.oe2v2.mongodb.net/?retryWrites=true&w=majority&appName=formulario'

try:
    client = MongoClient(MONGO_URI)
    client.admin.command('ping')
    logger.info("Conexão estabelecida com o MongoDB Atlas ")
except Exception as e:
    logger.error('Erro ao conectar ao MongoDB Atlas'.format(e))

db = client['formulario']
collection = db['dados_inspeccao']

def get_next_product_id():
    try:
        # Busca o último produto com o maior product_id
        last_product = collection.find_one(sort=[("product_id", -1)])
        if last_product and "product_id" in last_product:
            # Se product_id for string, tenta converter para int
            if isinstance(last_product["product_id"], str):
                try:
                    return int(last_product["product_id"]) + 1
                except ValueError:
                    return str(datetime.now().timestamp()).replace(".", "")
            return last_product["product_id"] + 1  # Incrementa +1
        else:
            return 1  # Começa do 1 se não houver registros
    except Exception as e:
        print(f"Erro ao gerar product_id: {str(e)}")
        return str(datetime.now().timestamp()).replace(".", "")  # Usa timestamp como fallback

# Certifique-se de que a pasta de uploads existe
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


class Detection:
    def __init__(self):
        # Baixe os pesos do YOLO e altere o caminho conforme necessário
        self.model = YOLO(r"yolov11_custom.pt")

    def predict(self, img, classes=[], conf=0.5):
        if classes:
            results = self.model.predict(img, classes=classes, conf=conf)
        else:
            results = self.model.predict(img, conf=conf)
        return results

    def predict_and_detect(self, img, classes=[], conf=0.5, rectangle_thickness=2, text_thickness=1):
        results = self.predict(img, classes, conf=conf)
        
        # Cria uma cópia da imagem para não modificar a original
        img_with_boxes = img.copy()
        
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = result.names[class_id]
                confidence = float(box.conf[0])

                # Define a cor do quadrado com base no status do objeto
                if class_name.lower() == "intacto":
                    box_color = (0, 255, 0)  # Verde para objetos intactos
                else:
                    box_color = (0, 0, 255)  # Vermelho para objetos danificados (em BGR)

                # Coordenadas do retângulo
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Desenha o quadrado ao redor do objeto
                cv2.rectangle(img_with_boxes, (x1, y1), (x2, y2), box_color, rectangle_thickness)

                # Prepara o texto
                text = f"{class_name} {confidence:.2f}"
                text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                
                # Posição do texto
                text_x = x1
                text_y = y1 - 5 if y1 - 5 > text_size[1] else y1 + text_size[1] + 5
                
                # Desenha o fundo do texto
                cv2.rectangle(
                    img_with_boxes, 
                    (text_x, text_y - text_size[1] - 5), 
                    (text_x + text_size[0], text_y + 5), 
                    box_color, 
                    -1
                )
                
                # Adiciona o texto
                cv2.putText(
                    img_with_boxes, 
                    text,
                    (text_x, text_y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    0.5, 
                    (255, 255, 255),  # Texto branco para melhor contraste
                    text_thickness
                )
                
        return img_with_boxes, results

    def detect_from_image(self, image):
        result_img, results = self.predict_and_detect(image, classes=[], conf=0.5)
        return result_img, results

    def detect_from_video_frame(self, frame):
        result_img, results = self.predict_and_detect(frame, classes=[], conf=0.5)
        return result_img, results


detection = Detection()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/cadastro')
def cadastro():
    return render_template('cadastro.html')

@app.route('/monitoramento')
def monitoramento():
    return render_template('monitoramento.html')

@app.route('/deteccao')
def deteccao():
    return render_template('deteccaoimg.html')

        
@app.route('/video')
def index_video():
    return render_template('video.html')


def gen_frames():
    cap = cv2.VideoCapture(0)  # Use 0 para a câmera padrão
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Redimensiona o frame para 512x512
        frame = cv2.resize(frame, (512, 512))

        # Aplica a detecção de objetos no frame
        frame_with_detection, _ = detection.detect_from_video_frame(frame)

        # Converte o frame para JPEG
        ret, buffer = cv2.imencode('.jpg', frame_with_detection)
        if not ret:
            continue

        # Converte o buffer para bytes
        frame_bytes = buffer.tobytes()

        # Retorna o frame no formato de streaming
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    # Libera a câmera quando o loop termina
    cap.release()


@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/process-video-frame', methods=['POST'])
def process_video_frame():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'Dados inválidos'}), 400
        
        # Decodifica a imagem base64
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        image_bytes = base64.b64decode(image_data)
        
        # Converte para numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Aplica a detecção
        img_with_detection, results = detection.detect_from_video_frame(img)
        
        # Verifica se algum objeto foi detectado
        detected = False
        objects = []
        status = 'intacto'  # Status padrão
        confidence = 0.0
        
        for result in results:
            for box in result.boxes:
                detected = True
                class_id = int(box.cls[0])
                class_name = result.names[class_id]
                conf = float(box.conf[0])
                
                # Determina o status com base na classe
                if class_name.lower() != 'intacto':
                    status = 'danificado'
                
                objects.append({
                    'name': class_name,
                    'confidence': conf,
                    'status': 'intacto' if class_name.lower() == 'intacto' else 'danificado'
                })
                
                # Guarda a maior confiança
                if conf > confidence:
                    confidence = conf
        
        # Converte a imagem processada para base64
        _, buffer = cv2.imencode('.jpg', img_with_detection, [cv2.IMWRITE_JPEG_QUALITY, 95])
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'detected': detected,
            'objects': objects,
            'status': status,
            'confidence': confidence,
            'processed_image': img_base64
        })
        
    except Exception as e:
        logger.error(f"Erro ao processar frame de vídeo: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/save-video-detection', methods=['POST'])
def save_video_detection():
    try:
        data = request.json
        if not data or 'product_id' not in data or 'image_url' not in data:
            return jsonify({'error': 'Dados incompletos'}), 400
        
        # Extrai os dados
        product_id = data['product_id']
        image_url = data['image_url']
        status = data.get('status', 'intacto')
        confidence = data.get('confidence', 0.0)
        timestamp = data.get('timestamp', datetime.utcnow().isoformat())
        
        # Processa a URL da imagem para extrair os dados base64
        if ',' in image_url:
            image_data = image_url.split(',')[1]
        else:
            image_data = image_url
        
        # Salva no banco de dados
        detection_data = {
            'product_id': product_id,
            'processed_image': image_data,
            'detected_object': data.get('detected_objects', [{}])[0].get('name', 'Objeto'),
            'confidence': confidence,
            'timestamp': datetime.fromisoformat(timestamp) if isinstance(timestamp, str) else timestamp,
            'status': status
        }
        
        result = collection.insert_one(detection_data)
        
        return jsonify({
            'success': True,
            'message': 'Detecção salva com sucesso',
            'id': str(result.inserted_id)
        })
        
    except Exception as e:
        logger.error(f"Erro ao salvar detecção de vídeo: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/object-detection/', methods=['POST'])
def apply_detection():
    if 'image' not in request.files:
        return 'No file part', 400

    file = request.files['image']

    if file.filename == '':
        return 'No selected file', 400

    if file:
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            # CRITICAL FIX: Load image properly preserving colors
            # Use PIL to load the image correctly in RGB
            original_img = Image.open(file_path).convert("RGB")
            img_array = np.array(original_img)
            
            # Resize if needed
            img_array = cv2.resize(img_array, (512, 512))
            
            # IMPORTANT: Convert to BGR for YOLOv5 processing
            # YOLOv5 expects BGR format for processing
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            # Run detection on BGR image
            img_with_detection, results = detection.detect_from_image(img_bgr)
            
            # Create a copy of the ORIGINAL RGB image for drawing
            # This is key - we start with the original RGB image
            img_with_boxes = img_array.copy()
            
            # Draw bounding boxes on the RGB image
            for result in results:
                for box in result.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    class_id = int(box.cls[0])
                    class_name = result.names[class_id]
                    confidence = float(box.conf[0])
                    
                    # Set color based on class (RGB format)
                    if class_name.lower() != "intacto":
                        color_rgb = (255, 0, 0)  # Red in RGB
                        box_color_bgr = (0, 0, 255)  # Red in BGR (for OpenCV drawing)
                    else:
                        color_rgb = (0, 255, 0)  # Green in RGB
                        box_color_bgr = (0, 255, 0)  # Green in BGR (for OpenCV drawing)
                    
                    # Convert to BGR for OpenCV drawing functions
                    img_temp_bgr = cv2.cvtColor(img_with_boxes, cv2.COLOR_RGB2BGR)
                    
                    # Draw rectangle
                    cv2.rectangle(img_temp_bgr, (x1, y1), (x2, y2), box_color_bgr, 2)
                    
                    # Add text background
                    text = f"{class_name} {confidence:.2f}"
                    text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    cv2.rectangle(img_temp_bgr, 
                                 (x1, y1 - text_size[1] - 10), 
                                 (x1 + text_size[0], y1), 
                                 box_color_bgr, -1)
                    
                    # Add text
                    cv2.putText(img_temp_bgr, text, 
                                (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 
                                0.5, (255, 255, 255), 2)
                    
                    # Convert back to RGB
                    img_with_boxes = cv2.cvtColor(img_temp_bgr, cv2.COLOR_BGR2RGB)
            
            # Save the processed image as JPEG with high quality
            processed_path = os.path.join(app.config['UPLOAD_FOLDER'], f"processed_{filename}")
            
            # Convert to BGR for cv2.imwrite (which expects BGR)
            img_to_save = cv2.cvtColor(img_with_boxes, cv2.COLOR_RGB2BGR)
            cv2.imwrite(processed_path, img_to_save, [cv2.IMWRITE_JPEG_QUALITY, 100])
            
            # For database storage, encode as base64
            _, img_encoded = cv2.imencode('.jpg', img_to_save, [cv2.IMWRITE_JPEG_QUALITY, 100])
            img_base64 = base64.b64encode(img_encoded.tobytes()).decode("utf-8")

            # Generate product_id
            product_id = get_next_product_id()

            # Save to database
            image_data = {
                "product_id": product_id,
                "filename": filename,
                "processed_image": img_base64,
                "detected_object": class_name,
                "confidence": confidence,
                "timestamp": datetime.utcnow(),
                "status": "intacto" if class_name.lower() == "intacto" else "danificado"
            }
            collection.insert_one(image_data)

            # Remove original file
            os.remove(file_path)

            # Return the processed image
            return send_file(processed_path, mimetype='image/jpeg')

        except Exception as e:
            print(f"Erro ao processar a imagem: {str(e)}")
            return f"Erro interno: {str(e)}", 500


@app.route('/api-info')
def get_api_info():
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Get date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build filter
        filter_query = {}
        if start_date and end_date:
            # Convert to datetime objects
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            end = end.replace(hour=23, minute=59, second=59)
            filter_query['timestamp'] = {'$gte': start, '$lte': end}
        
        # Query the database
        products = list(collection.find(
            filter_query, 
            {'_id': 0}
        ).sort('timestamp', -1).skip(skip).limit(limit))
        
        # Count by status
        intact_count = collection.count_documents({**filter_query, 'status': 'intacto'})
        damaged_count = collection.count_documents({**filter_query, 'status': 'danificado'})
        
        # Format data for frontend
        for product in products:
            if 'timestamp' in product and isinstance(product['timestamp'], datetime):
                product['timestamp'] = product['timestamp'].isoformat()
        
        return jsonify({
            'data': products,
            'page': page,
            'intact_count': intact_count,
            'damaged_count': damaged_count
        })
    
    except Exception as e:
        print(f"Error fetching API info: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api-image/up-image/<product_id>')
def get_product_images(product_id):
    try:
        # Find all images for this product
        images = list(collection.find(
            {'product_id': product_id},
            {'_id': 0, 'product_id': 1, 'processed_image': 1, 'timestamp': 1}
        ))
        
        # Format the response
        formatted_images = []
        for img in images:
            if 'processed_image' in img:
                # Create a data URL from the base64 image
                image_url = f"data:image/jpeg;base64,{img['processed_image']}"
                formatted_images.append({
                    'product_id': img['product_id'],
                    'image_url': image_url,
                    'timestamp': img['timestamp'].isoformat() if isinstance(img['timestamp'], datetime) else img['timestamp']
                })
        
        return jsonify(formatted_images)
    
    except Exception as e:
        print(f"Error fetching product images: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/results')
def show_results():
    try:
        # Busca as imagens mais recentes
        imagens = list(collection.find().sort("timestamp", -1))
        
        # Formata as datas para exibição
        for img in imagens:
            if isinstance(img["timestamp"], datetime):
                img["timestamp"] = img["timestamp"]
            else:
                try:
                    img["timestamp"] = datetime.fromisoformat(img["timestamp"])
                except:
                    img["timestamp"] = datetime.utcnow()
        
        return render_template("results.html", imagens=imagens)
    except Exception as e:
        print(f"Erro ao buscar resultados: {str(e)}")
        return f"Erro ao carregar resultados: {str(e)}", 500


# Rota para download da imagem
@app.route("/download/<filename>")
def download_image(filename):
    image_path = f"static/images/{filename}"
    return send_file(image_path, as_attachment=True)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=17000, debug=True)