// ARQUIVO PRINCIPAL, SERVIDOR

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sensorDataRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/sensorData.js";
import productInfoRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/productInfoRoute.js";
import uploadImageRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/uploadImage.js";
import weightRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/weightRoute.js";

import userRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/route.js";
import autRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/autenticacao.route.js";
import videoDetectionRoute from "./Object-Detection-Yolo-Flask-main-v3/src/route/videoDetectionRoute.js";

import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import fs from "fs";
import mongoose from "mongoose";

// Configuração para __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Modificar a porta do servidor Node.js para evitar conflito com o servidor Python
const port = process.env.PORT || 18000; // Alterado para 18000 para evitar conflito com o servidor Python

// Variável global para armazenar o último peso lido
global.lastWeight = {
  weight: 0,
  timestamp: new Date().toISOString(),
};

// Array para armazenar os pesos estáveis salvos
global.savedWeights = [];

app.use(
  cors({
    methods: "GET,POST,PUT,DELETE", // Define os métodos HTTP permitidos
    allowedHeaders: "Content-Type,Authorization", // Define os headers permitidos
  })
);

// Configuração para servir arquivos estáticos
app.use(
  "/static",
  express.static(
    path.join(__dirname, "Object-Detection-Yolo-Flask-main-v3/static")
  )
);

// Configuração para templates
app.set(
  "views",
  path.join(__dirname, "Object-Detection-Yolo-Flask-main-v3/templates")
);
app.set("view engine", "html");
app.engine("html", (filePath, options, callback) => {
  fs.readFile(filePath, (err, content) => {
    if (err) return callback(err);
    return callback(null, content.toString());
  });
});

// Modificar a conexão com o MongoDB para adicionar opções de reconexão e aumentar o timeout
// Localizar a linha onde o connectDatabase é chamado e substituir por:

// Configuração de conexão com o MongoDB com opções de reconexão
mongoose
  .connect(process.env.BANCODEDADOS, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Aumentar o timeout para 30 segundos
    socketTimeoutMS: 45000, // Aumentar o timeout do socket
    connectTimeoutMS: 30000, // Aumentar o timeout de conexão
    // Opções de reconexão
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000,
  })
  .then(() => console.log("MongoDB Conectado com configurações de reconexão"))
  .catch((error) => {
    console.error("Erro ao conectar ao MongoDB:", error);
    console.log("Usando armazenamento local temporário para os pesos");
  });

//connectDataBase()
app.use(express.json());
app.use("/user", userRoute);
app.use("/autenticacao", autRoute);

// Registrando as rotas da API
app.use("/api-sensor", sensorDataRoute);
app.use("/api-info", productInfoRoute);
app.use("/api-image", uploadImageRoute);
app.use("/api-weight", weightRoute);

// Modificar a rota para obter o peso atual para ser mais específica
app.get("/api-weight/current-weight", (req, res) => {
  console.log(
    "Requisição para /api-weight/current-weight, retornando:",
    global.lastWeight
  );
  res.status(200).json(global.lastWeight);
});

// Modificar a rota para receber o peso atual para ser mais específica
app.post("/api-weight/update-weight", (req, res) => {
  const { weight } = req.body;

  if (weight !== undefined) {
    global.lastWeight = {
      weight: Number(weight),
      timestamp: new Date().toISOString(),
    };
    console.log("Peso atualizado:", global.lastWeight);
    res
      .status(200)
      .json({ success: true, message: "Peso atualizado com sucesso" });
  } else {
    res.status(400).json({ success: false, message: "Peso não fornecido" });
  }
});

// Atualizar o modelo para os pesos estáveis
const StableWeightSchema = new mongoose.Schema({
  weight: { type: Number, required: true }, // Média dos pesos
  rawWeight: { type: Number }, // Peso original antes da média
  samples: { type: Number }, // Número de amostras coletadas
  sampleData: { type: [Number] }, // Array com todas as amostras para depuração
  status: { type: String, enum: ["aprovado", "reprovado"], required: true },
  timestamp: { type: Date, default: Date.now },
  isManual: { type: Boolean, default: false }, // Indica se foi uma pesagem manual
});

const StableWeight = mongoose.model("StableWeight", StableWeightSchema);

// Adicionar um mecanismo de fallback para armazenar os pesos localmente quando o MongoDB falhar
// Adicionar após a definição do modelo StableWeight:

// Array para armazenar pesos localmente quando o MongoDB falhar
const localWeightStorage = [];
const MAX_LOCAL_STORAGE = 50; // Limitar o armazenamento local

// Função para salvar peso localmente
function saveWeightLocally(weightData) {
  console.log(
    "Salvando peso localmente devido a falha no MongoDB:",
    weightData
  );

  // Adicionar ID local e timestamp
  const localWeight = {
    ...weightData,
    _id: `local_${Date.now()}`,
    timestamp: weightData.timestamp || new Date(),
  };

  // Adicionar ao início do array
  localWeightStorage.unshift(localWeight);

  // Limitar o tamanho do armazenamento local
  if (localWeightStorage.length > MAX_LOCAL_STORAGE) {
    localWeightStorage.pop();
  }

  // Atualizar o array global de pesos salvos
  global.savedWeights = [...localWeightStorage];

  return localWeight;
}

// Modificar a rota para salvar um peso estável para usar o fallback
// Substituir a rota /api-weight/save-stable-weight por:

// Atualizar a rota para salvar um peso estável no banco de dados
app.post("/api-weight/save-stable-weight", async (req, res) => {
  try {
    const { weight, rawWeight, samples, sampleData, status, timestamp } =
      req.body;

    console.log("Recebido pedido para salvar peso estável:", {
      weight,
      samples,
      status,
    });

    if (weight === undefined || !status) {
      return res.status(400).json({
        success: false,
        message: "Peso e status são obrigatórios",
      });
    }

    // Criar um novo registro de peso estável
    const stableWeight = new StableWeight({
      weight: Number(weight),
      rawWeight: rawWeight ? Number(rawWeight) : undefined,
      samples: samples || undefined,
      sampleData: sampleData || undefined,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    try {
      // Tentar salvar no banco de dados com timeout reduzido
      await Promise.race([
        stableWeight.save(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout ao salvar no MongoDB")),
            5000
          )
        ),
      ]);

      console.log("Peso estável salvo com sucesso no MongoDB:", stableWeight);

      // Adicionar ao array global de pesos salvos
      global.savedWeights.unshift({
        id: stableWeight._id.toString(),
        weight: stableWeight.weight,
        rawWeight: stableWeight.rawWeight,
        samples: stableWeight.samples,
        sampleData: stableWeight.sampleData,
        status: stableWeight.status,
        timestamp: stableWeight.timestamp,
      });
    } catch (dbError) {
      console.error(
        "Erro ao salvar no MongoDB, usando armazenamento local:",
        dbError
      );

      // Salvar localmente como fallback
      const localWeight = saveWeightLocally({
        weight: Number(weight),
        rawWeight: rawWeight ? Number(rawWeight) : undefined,
        samples: samples || undefined,
        sampleData: sampleData || undefined,
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      });

      console.log("Peso salvo localmente:", localWeight);
    }

    // Manter apenas os 10 registros mais recentes
    if (global.savedWeights.length > 10) {
      global.savedWeights = global.savedWeights.slice(0, 10);
    }

    res.status(201).json({
      success: true,
      message: "Peso estável processado com sucesso",
      data: {
        weight: Number(weight),
        samples: samples || undefined,
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });
  } catch (error) {
    console.error("Erro ao processar peso estável:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar peso estável",
      error: error.message,
    });
  }
});

// Modificar a rota para obter os pesos estáveis salvos
// Substituir a rota /api-weight/saved-weights por:

// Rota para obter os pesos estáveis salvos
app.get("/api-weight/saved-weights", async (req, res) => {
  try {
    // Retornar os pesos salvos do array global
    res.status(200).json(global.savedWeights);
  } catch (error) {
    console.error("Erro ao obter pesos estáveis:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter pesos estáveis",
      error: error.message,
    });
  }
});

// Rota para salvar um peso manualmente (a partir da interface)
app.post("/api-weight/manual-weighing", async (req, res) => {
  try {
    const { weight, samples, sampleData, status, timestamp } = req.body;

    console.log("Recebido pedido para salvar peso manual:", {
      weight,
      samples,
      status,
    });

    if (weight === undefined || !status) {
      return res.status(400).json({
        success: false,
        message: "Peso e status são obrigatórios",
      });
    }

    // Criar um novo registro de peso estável
    const stableWeight = new StableWeight({
      weight: Number(weight),
      samples: samples || undefined,
      sampleData: sampleData || undefined,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      isManual: true, // Marcar como pesagem manual
    });

    try {
      // Tentar salvar no banco de dados com timeout reduzido
      await Promise.race([
        stableWeight.save(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout ao salvar no MongoDB")),
            5000
          )
        ),
      ]);

      console.log("Peso manual salvo com sucesso no MongoDB:", stableWeight);

      // Adicionar ao array global de pesos salvos
      global.savedWeights.unshift({
        id: stableWeight._id.toString(),
        weight: stableWeight.weight,
        samples: stableWeight.samples,
        sampleData: stableWeight.sampleData,
        status: stableWeight.status,
        timestamp: stableWeight.timestamp,
        isManual: true,
      });
    } catch (dbError) {
      console.error(
        "Erro ao salvar no MongoDB, usando armazenamento local:",
        dbError
      );

      // Salvar localmente como fallback
      const localWeight = saveWeightLocally({
        weight: Number(weight),
        samples: samples || undefined,
        sampleData: sampleData || undefined,
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        isManual: true,
      });

      console.log("Peso manual salvo localmente:", localWeight);
    }

    // Manter apenas os 10 registros mais recentes
    if (global.savedWeights.length > 10) {
      global.savedWeights = global.savedWeights.slice(0, 10);
    }

    res.status(201).json({
      success: true,
      message: "Peso manual salvo com sucesso",
      data: {
        weight: Number(weight),
        samples: samples || undefined,
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });
  } catch (error) {
    console.error("Erro ao salvar peso manual:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao salvar peso manual",
      error: error.message,
    });
  }
});

app.use("/", videoDetectionRoute);

// Rota para a página de pesagem
app.get("/pesagem", (req, res) => {
  console.log("Acessando a página de pesagem");
  res.sendFile(
    path.join(
      __dirname,
      "Object-Detection-Yolo-Flask-main-v3/templates/pesagem.html"
    )
  );
});

// Rota para a página de monitoramento
app.get("/monitoramento", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "Object-Detection-Yolo-Flask-main-v3/templates/monitoramento.html"
    )
  );
});

// Rota para a página de resultados
app.get("/results", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "Object-Detection-Yolo-Flask-main-v3/templates/results.html"
    )
  );
});

// Rota para a página de detecção
app.get("/deteccao", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "Object-Detection-Yolo-Flask-main-v3/templates/deteccaoImg.html"
    )
  );
});

// Rota para a página de vídeo
app.get("/video", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "Object-Detection-Yolo-Flask-main-v3/templates/video.html"
    )
  );
});

app.listen(port, () => console.log(`Servidor Rodando na porta ${port}`));
