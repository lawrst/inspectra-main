# Este script adiciona rotas ao servidor Flask para redirecionar requisições para o servidor Node.js
import requests
from flask import Flask, jsonify, request, Blueprint

# Criar um Blueprint para as rotas da API de peso
weight_api = Blueprint('weight_api', __name__)

# URL do servidor Node.js
NODE_SERVER_URL = "http://localhost:18000"

@weight_api.route('/api-weight/current-weight', methods=['GET'])
def get_current_weight():
    """Redireciona a requisição para o servidor Node.js e retorna o resultado"""
    try:
        # Fazer requisição para o servidor Node.js
        response = requests.get(f"{NODE_SERVER_URL}/api-weight/current-weight")
        
        # Verificar se a requisição foi bem-sucedida
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({
                "error": f"Erro ao obter dados do servidor Node.js: {response.status_code}",
                "weight": 0,
                "timestamp": "2023-01-01T00:00:00.000Z"
            }), 500
    except Exception as e:
        print(f"Erro ao conectar ao servidor Node.js: {str(e)}")
        return jsonify({
            "error": f"Erro ao conectar ao servidor Node.js: {str(e)}",
            "weight": 0,
            "timestamp": "2023-01-01T00:00:00.000Z"
        }), 500

@weight_api.route('/api-weight/update-weight', methods=['POST'])
def update_weight():
    """Redireciona a requisição POST para o servidor Node.js e retorna o resultado"""
    try:
        # Obter os dados da requisição
        data = request.json
        
        # Fazer requisição para o servidor Node.js
        response = requests.post(
            f"{NODE_SERVER_URL}/api-weight/update-weight",
            json=data
        )
        
        # Verificar se a requisição foi bem-sucedida
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({
                "error": f"Erro ao atualizar dados no servidor Node.js: {response.status_code}",
                "success": False
            }), 500
    except Exception as e:
        print(f"Erro ao conectar ao servidor Node.js: {str(e)}")
        return jsonify({
            "error": f"Erro ao conectar ao servidor Node.js: {str(e)}",
            "success": False
        }), 500

# Instruções para adicionar ao app.py:
"""
Para usar este módulo, adicione as seguintes linhas ao seu app.py:

from api_bridge import weight_api

# Registrar o blueprint
app.register_blueprint(weight_api)
"""

