### INSPECTRA - Sistema de Inspeção e Controle de Qualidade

## Visão Geral

INSPECTRA é um sistema integrado de inspeção e controle de qualidade que combina visão computacional, sensores de peso e uma interface web intuitiva para monitorar e avaliar produtos em uma linha de produção. O sistema utiliza algoritmos de detecção de objetos baseados em YOLO para identificar defeitos em produtos através de imagens e vídeo em tempo real, além de integrar sensores de peso para verificação de conformidade.

## Funcionalidades Principais

- **Detecção de Defeitos por Imagem**: Upload e análise de imagens para identificação de produtos defeituosos
- **Inspeção por Vídeo em Tempo Real**: Monitoramento contínuo via webcam ou câmera
- **Monitoramento de Peso**: Integração com sensores de peso via Arduino UNO
- **Dashboard de Monitoramento**: Visualização de estatísticas e histórico de inspeções
- **Armazenamento de Dados**: Registro de todas as inspeções com imagens, status e timestamps
- **Autenticação de Usuários**: Sistema de login e cadastro para controle de acesso


## Tecnologias Utilizadas

- **Backend**: Node.js, Express, Flask (Python)
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Banco de Dados**: MongoDB
- **Visão Computacional**: YOLO, OpenCV
- **Hardware**: Arduino (para sensores de peso)
- **Comunicação Serial**: SerialPort (Node.js)


## Requisitos do Sistema

### Software

- Node.js (v14.0.0 ou superior)
- Python 3.8 ou superior
- MongoDB (local ou Atlas)
- npm ou yarn


### Hardware (opcional para funcionalidade completa)

- Arduino Uno ou similar
- Célula de carga (Load Cell)
- Módulo HX711 (amplificador para célula de carga)
- Webcam ou câmera (para detecção por vídeo)


## Instalação e Configuração

### 1. Clone o repositório

```shellscript
git clone https://github.com/seu-usuario/inspectra.git
cd inspectra
```

### 2. Instale as dependências do Node.js

```shellscript
npm install
```

### 3. Instale as dependências do Python

```shellscript
pip install -r requirements.txt
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```plaintext
BANCODEDADOS=mongodb://seu-usuario:sua-senha@localhost:27017/inspectra
SECRET_JWT=sua-chave-secreta-para-jwt
PORT=18000
ARDUINO_PORT=COM3  # Ajuste conforme a porta do seu Arduino (Windows: COMx, Linux: /dev/ttyACMx, Mac: /dev/tty.usbmodemx)
```

### 5. Inicie o servidor Node.js

```shellscript
npm start
```

### 6. Inicie o servidor Flask (em outro terminal)

```shellscript
python app.py
```

### 7. Inicie o bridge Arduino (opcional, apenas se estiver usando sensor de peso)

```shellscript
node arduino-serial-bridge.js
```

## Como Usar o Sistema

### Acesso ao Sistema

1. Após iniciar os servidores, acesse `http://localhost:18000` no navegador
2. Faça login com suas credenciais ou crie uma nova conta


### Inspeção por Imagem

1. Navegue até a seção "Inspeção por Foto"
2. Faça upload de uma imagem do produto
3. O sistema processará a imagem e exibirá o resultado da detecção


### Inspeção por Vídeo

1. Navegue até a seção "Inspeção por Vídeo"
2. Permita o acesso à webcam quando solicitado
3. O sistema detectará automaticamente produtos e seu estado


### Monitoramento de Peso

1. Navegue até a seção "Pesagem"
2. O sistema exibirá o peso atual do produto no sensor
3. Utilize o botão "Tarar Balança" para zerar a leitura
4. Utilize o botão "Iniciar Pesagem" para coletar amostras por 5 segundos e calcular a média


### Dashboard de Monitoramento

1. Navegue até a seção "Monitoramento"
2. Visualize estatísticas de inspeções, gráficos e histórico
3. Utilize os filtros de data para refinar os resultados


## Configuração do Sensor de Peso (Arduino)

### Componentes Necessários

- Arduino Uno ou similar
- Célula de carga (Load Cell)
- Módulo amplificador HX711
- Cabos de conexão


### Conexões

1. **HX711 para Arduino**:

1. VCC → 5V
2. GND → GND
3. DT → Pino digital 2
4. SCK → Pino digital 3



2. **Célula de Carga para HX711**:

1. Vermelho → E+
2. Preto → E-
3. Branco → A-
4. Verde → A+





### Código Arduino

O código para o Arduino está disponível na pasta `arduino-code`. Carregue o arquivo `weight_sensor.ino` para o seu Arduino usando a IDE Arduino.

### Calibração

1. Execute o sistema com o Arduino conectado
2. Acesse a página de Pesagem
3. Siga as instruções na tela para calibrar o sensor:

1. Remova qualquer peso da balança e clique em "Tarar"
2. Coloque um peso conhecido (preferencialmente 395g) quando solicitado
3. O sistema calculará automaticamente o fator de calibração





## Solução de Problemas Comuns

### Erro de Conexão com o MongoDB

- Verifique se o MongoDB está em execução
- Confirme se a string de conexão no arquivo `.env` está correta
- Execute `node db-connection-test.js` para diagnosticar problemas


### Sensor de Peso Não Detectado

- Verifique se o Arduino está conectado corretamente
- Confirme a porta serial no arquivo `.env` (ARDUINO_PORT)
- Execute `node arduino-weight-simulator.js` para testar o sistema com um simulador


### Detecção de Objetos Não Funciona

- Verifique se o servidor Flask está em execução
- Confirme se os modelos YOLO estão no diretório correto
- Verifique os logs do servidor Flask para erros específicos


### Problemas de Integração Python/Node.js

- Verifique se ambos os servidores estão em execução
- Execute `node proxy-server.js` para facilitar a comunicação entre os servidores
- Verifique se as portas configuradas não estão sendo bloqueadas por firewall


## Requisitos de Hardware Recomendados

- **CPU**: Intel Core i5 ou superior (para processamento de imagem em tempo real)
- **RAM**: Mínimo 8GB (16GB recomendado para melhor desempenho)
- **GPU**: Recomendada para aceleração da detecção de objetos (NVIDIA com suporte CUDA)
- **Armazenamento**: 10GB de espaço livre para o sistema e banco de dados
- **Rede**: Conexão estável para acesso ao MongoDB Atlas (se usado)
