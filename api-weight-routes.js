// Rotas API para pesos com tratamento de erros aprimorado
import express from "express";
import mongoose from "mongoose";
import localStorage from "./local-weight-storage.js";

const router = express.Router();

// Modelo para os pesos estáveis
const StableWeightSchema = new mongoose.Schema({
  weight: { type: Number, required: true },
  rawWeight: { type: Number },
  samples: { type: Number },
  sampleData: { type: [Number] },
  status: { type: String, enum: ["aprovado", "reprovado"], required: true },
  timestamp: { type: Date, default: Date.now },
});

// Criar o modelo apenas se não existir
const StableWeight =
  mongoose.models.StableWeight ||
  mongoose.model("StableWeight", StableWeightSchema);

// Variável global para armazenar o último peso lido
let lastWeight = {
  weight: 0,
  timestamp: new Date().toISOString(),
};

// Array para armazenar os pesos estáveis salvos
let savedWeights = [];

// Middleware para verificar a conexão com o MongoDB
const checkMongoConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.log("MongoDB desconectado, usando armazenamento local");
    req.useLocalStorage = true;
  } else {
    req.useLocalStorage = false;
  }
  next();
};

// Rota para obter o peso atual
router.get("/current-weight", (req, res) => {
  console.log(
    "Requisição para /api-weight/current-weight, retornando:",
    lastWeight
  );
  res.status(200).json(lastWeight);
});

// Rota para atualizar o peso atual
router.post("/update-weight", (req, res) => {
  const { weight } = req.body;

  if (weight !== undefined) {
    lastWeight = {
      weight: Number(weight),
      timestamp: new Date().toISOString(),
    };
    console.log("Peso atualizado:", lastWeight);
    res
      .status(200)
      .json({ success: true, message: "Peso atualizado com sucesso" });
  } else {
    res.status(400).json({ success: false, message: "Peso não fornecido" });
  }
});

// Rota para salvar um peso estável
router.post("/save-stable-weight", checkMongoConnection, async (req, res) => {
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

    // Dados do peso a serem salvos
    const weightData = {
      weight: Number(weight),
      rawWeight: rawWeight ? Number(rawWeight) : undefined,
      samples: samples || undefined,
      sampleData: sampleData || undefined,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    // Se o MongoDB estiver desconectado, salvar localmente
    if (req.useLocalStorage) {
      const localWeight = localStorage.addWeight({
        ...weightData,
        id: `local_${Date.now()}`,
      });

      // Atualizar o array global
      savedWeights.unshift({
        id: localWeight.id,
        weight: localWeight.weight,
        samples: localWeight.samples,
        status: localWeight.status,
        timestamp: localWeight.timestamp,
      });

      console.log("Peso salvo localmente devido a MongoDB desconectado");
    } else {
      // Tentar salvar no MongoDB
      try {
        // Criar um novo registro de peso estável
        const stableWeight = new StableWeight(weightData);

        // Salvar no banco de dados com timeout
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

        // Adicionar ao array global
        savedWeights.unshift({
          id: stableWeight._id.toString(),
          weight: stableWeight.weight,
          samples: stableWeight.samples,
          status: stableWeight.status,
          timestamp: stableWeight.timestamp,
        });
      } catch (dbError) {
        console.error(
          "Erro ao salvar no MongoDB, usando armazenamento local:",
          dbError
        );

        // Salvar localmente como fallback
        const localWeight = localStorage.addWeight({
          ...weightData,
          id: `local_${Date.now()}`,
        });

        // Atualizar o array global
        savedWeights.unshift({
          id: localWeight.id,
          weight: localWeight.weight,
          samples: localWeight.samples,
          status: localWeight.status,
          timestamp: localWeight.timestamp,
        });
      }
    }

    // Manter apenas os 10 registros mais recentes
    if (savedWeights.length > 10) {
      savedWeights = savedWeights.slice(0, 10);
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

// Rota para salvar um peso localmente (rota alternativa)
router.post("/save-local", (req, res) => {
  try {
    const { weight, samples, status, timestamp } = req.body;

    if (weight === undefined || !status) {
      return res.status(400).json({
        success: false,
        message: "Peso e status são obrigatórios",
      });
    }

    // Salvar localmente
    const localWeight = localStorage.addWeight({
      weight: Number(weight),
      samples: samples || undefined,
      status,
      timestamp: timestamp || new Date().toISOString(),
      id: `local_${Date.now()}`,
    });

    // Atualizar o array global
    savedWeights.unshift({
      id: localWeight.id,
      weight: localWeight.weight,
      samples: localWeight.samples,
      status: localWeight.status,
      timestamp: localWeight.timestamp,
    });

    // Manter apenas os 10 registros mais recentes
    if (savedWeights.length > 10) {
      savedWeights = savedWeights.slice(0, 10);
    }

    console.log("Peso salvo localmente com sucesso");

    res.status(201).json({
      success: true,
      message: "Peso salvo localmente com sucesso",
      data: localWeight,
    });
  } catch (error) {
    console.error("Erro ao salvar peso localmente:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao salvar peso localmente",
      error: error.message,
    });
  }
});

// Rota para obter os pesos estáveis salvos
router.get("/saved-weights", checkMongoConnection, async (req, res) => {
  try {
    // Se estiver usando armazenamento local, obter os pesos do armazenamento local
    if (req.useLocalStorage) {
      const localWeights = localStorage.getRecentWeights(10);
      res.status(200).json(localWeights);
      return;
    }

    // Tentar obter os pesos do MongoDB
    try {
      // Tentar buscar os pesos mais recentes do MongoDB
      const dbWeights = await StableWeight.find()
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      // Formatar os pesos para o formato esperado pelo frontend
      const formattedWeights = dbWeights.map((weight) => ({
        id: weight._id.toString(),
        weight: weight.weight,
        samples: weight.samples,
        status: weight.status,
        timestamp: weight.timestamp,
      }));

      // Atualizar o array global
      savedWeights = formattedWeights;

      res.status(200).json(formattedWeights);
    } catch (dbError) {
      console.error(
        "Erro ao buscar pesos do MongoDB, usando armazenamento local:",
        dbError
      );

      // Fallback para o armazenamento local
      const localWeights = localStorage.getRecentWeights(10);
      res.status(200).json(localWeights);
    }
  } catch (error) {
    console.error("Erro ao obter pesos estáveis:", error);

    // Em caso de erro, retornar o array global
    res.status(200).json(savedWeights);
  }
});

// Rota para sincronizar pesos locais com o MongoDB
router.post("/sync-weights", async (req, res) => {
  try {
    // Verificar se o MongoDB está conectado
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "MongoDB desconectado, não é possível sincronizar",
      });
    }

    // Sincronizar pesos locais com o MongoDB
    const result = await localStorage.syncWithMongoDB(StableWeight);

    res.status(200).json({
      success: true,
      message: `Sincronização concluída: ${result.synced} pesos sincronizados`,
      result,
    });
  } catch (error) {
    console.error("Erro ao sincronizar pesos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao sincronizar pesos",
      error: error.message,
    });
  }
});

// Exportar as variáveis e o router
export { lastWeight, savedWeights, StableWeight };
export default router;
