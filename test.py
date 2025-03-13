from pymongo import MongoClient

# Conectar ao MongoDB
client = MongoClient('mongodb+srv://userDB:diva739GJçq@formulario.oe2v2.mongodb.net/?retryWrites=true&w=majority&appName=formulario')
db = client['formulario']  # Nome do banco de dados
collection = db['dados_inspeccao']  # Nome da coleção

# Conteúdo em Base64 (substitua pelo valor real da imagem)
video_img_base64 = "seu_conteudo_base64_aqui"

# Atualizar todos os documentos adicionando o campo "video_processed_image" sem sobrescrever outros valores
resultado = collection.update_many({}, {"$set": {"video_processed_image": video_img_base64}})

# Exibir resultado
if resultado.modified_count > 0:
    print(f"Campo 'video_processed_image' adicionado a {resultado.modified_count} documentos!")
else:
    print("Nenhum documento foi modificado. O campo já pode existir em todos os documentos.")
