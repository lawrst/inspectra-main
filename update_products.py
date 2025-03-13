from pymongo import MongoClient

# Conectar ao MongoDB
client = MongoClient('mongodb+srv://userDB:diva739GJçq@formulario.oe2v2.mongodb.net/?retryWrites=true&w=majority&appName=formulario')
db = client['formulario']  # Substitua pelo nome do seu banco de dados
collection = db['dados_inspeccao']  # Substitua pelo nome da sua coleção

# Verificar se existe o campo "video_processed_image" em qualquer documento
documento = collection.find_one({"video_processed_image": {"$exists": True}})

if documento:
    print("Campo 'video_processed_image' encontrado no documento!")
else:
    print("Campo 'video_processed_image' não encontrado.")
