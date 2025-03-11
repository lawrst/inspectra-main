from flask import Flask, request, render_template, send_file, Response
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
from flask import jsonify

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

db = client ['formulario']
collection = db['dados_inspeccao']

def get_next_product_id():
    try:
        # Busca o último produto com o maior product_id
        last_product = collection.find_one(sort=[("product_id", -1)])
        if last_product and "product_id" in last_product:
            return last_product["product_id"] + 1  # Incrementa +1
        else:
            return 1  # Começa do 1 se não houver registros
    except Exception as e:
        print(f"Erro ao gerar product_id: {str(e)}")
        return 1  # Valor padrão em caso de erro

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
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                class_name = result.names[class_id]

                # Define a cor do quadrado com base no status do objeto
                if class_name == "Intacto":
                    box_color = (0, 255, 0)  # Verde para objetos intactos
                else:
                    box_color = (255, 0, 0)  # Vermelho para outros objetos

                # Desenha o quadrado ao redor do objeto
                cv2.rectangle(img, (int(box.xyxy[0][0]), int(box.xyxy[0][1])),
                            (int(box.xyxy[0][2]), int(box.xyxy[0][3])), box_color, rectangle_thickness)

                # Adiciona o nome da classe acima do quadrado
                cv2.putText(img, f"{class_name}",
                            (int(box.xyxy[0][0]), int(box.xyxy[0][1]) - 10),
                            cv2.FONT_HERSHEY_PLAIN, 1, box_color, text_thickness)
        return img, results











    def detect_from_image(self, image):
        result_img, results = self.predict_and_detect(image, classes=[], conf=0.5)
        return result_img, results

    def detect_from_video_frame(self, frame):
        result_img, _ = self.predict_and_detect(frame, classes=[], conf=0.5)
        return result_img


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

            # Processar a imagem
            img = Image.open(file_path).convert("RGB")
            img = np.array(img)
            img = cv2.resize(img, (512, 512))
            img, results = detection.detect_from_image(img)

            # Contar objetos intactos e danificados
            intact_count = 0
            damaged_count = 0
            for result in results:
                for box in result.boxes:
                    class_id = int(box.cls[0])
                    class_name = result.names[class_id]
                    confidence = float(box.conf[0])
                    if class_name == "Intacto":
                        intact_count += 1
                    elif class_name == "Danificado":
                        damaged_count += 1

                    # Gerar um ID numérico único
                    product_id = get_next_product_id()

                    # Salvar cada objeto detectado no MongoDB
                    detection_data = {
                        "product_id": product_id,  # ID numérico
                        "filename": filename,
                        "detected_object": class_name,
                        "confidence": confidence,
                        "timestamp": datetime.now(),
                        "status": "intacto" if class_name == "Intacto" else "defeito"
                    }
                    collection.insert_one(detection_data)

            # Converter a imagem processada para PNG
            output = Image.fromarray(img)
            buf = io.BytesIO()
            output.save(buf, format="PNG")
            buf.seek(0)

            # Remover arquivo original
            os.remove(file_path)

            # Retornar a imagem processada
            return send_file(buf, mimetype='image/png')

        except Exception as e:
            print(f"Erro ao processar a imagem: {str(e)}")
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
            return f"Erro interno: {str(e)}", 500

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
        frame = detection.detect_from_video_frame(frame)

        # Converte o frame para JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
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


@app.route('/api-info', methods=['GET'])
def get_inspection_data():
    try:
        # Paginação
        page = int(request.args.get('page', 1))  # Página atual
        limit = int(request.args.get('limit', 20))  # Registros por página
        skip = (page - 1) * limit  # Pular registros

        # Filtro por data
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = {}

        if start_date and end_date:
            query["timestamp"] = {
                "$gte": datetime.strptime(start_date, "%Y-%m-%d"),
                "$lte": datetime.strptime(end_date, "%Y-%m-%d")
            }

        # Buscar dados filtrados
        inspections = list(collection.find(query).sort("timestamp", -1).skip(skip).limit(limit))
        total = collection.count_documents(query)

        # Contagem de status
        intact_count = collection.count_documents({**query, "status": "intacto"})
        damaged_count = collection.count_documents({**query, "status": "defeito"})

        # Formatar resposta JSON
        formatted_inspections = [
            {
                "_id": str(inspection['_id']),
                "product_id": inspection.get('product_id', 'N/A'),
                "timestamp": inspection.get('timestamp', datetime.now()).isoformat(),
                "status": inspection.get('status', 'N/A'),
                "peso": inspection.get('peso', 'N/A')  # Adiciona o campo "peso"
            }
            for inspection in inspections
        ]

        return jsonify({
            "data": formatted_inspections,
            "total": total,
            "page": page,
            "limit": limit,
            "intact_count": intact_count,
            "damaged_count": damaged_count
        }), 200

    except Exception as e:
        return jsonify({"error": f"Erro ao buscar dados: {str(e)}"}), 500



if __name__ == '__main__':
    app.run(host="0.0.0.0", port=17000, debug=True)