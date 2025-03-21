// Script para garantir que o peso médio seja exibido na página de pesagem
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 18002;

// Habilitar CORS e JSON
app.use(cors());
app.use(express.json());

// Conectar ao MongoDB
mongoose
  .connect(process.env.BANCODEDADOS, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Conectado para exibição de peso médio"))
  .catch((error) => console.log("Erro ao conectar ao MongoDB:", error));

// Modelo para os pesos estáveis
const StableWeightSchema = new mongoose.Schema({
  weight: { type: Number, required: true }, // Média dos pesos
  rawWeight: { type: Number }, // Peso original antes da média
  samples: { type: Number }, // Número de amostras coletadas
  sampleData: { type: [Number] }, // Array com todas as amostras para depuração
  status: { type: String, enum: ["aprovado", "reprovado"], required: true },
  timestamp: { type: Date, default: Date.now },
});

const StableWeight = mongoose.model("StableWeight", StableWeightSchema);

// Rota para obter o último peso médio salvo
app.get("/api-weight/latest-average", async (req, res) => {
  try {
    // Buscar o peso médio mais recente
    const latestWeight = await StableWeight.findOne().sort({ timestamp: -1 });

    if (latestWeight) {
      console.log("Último peso médio encontrado:", latestWeight);
      res.status(200).json({
        weight: latestWeight.weight,
        samples: latestWeight.samples || 5,
        status: latestWeight.status,
        timestamp: latestWeight.timestamp,
      });
    } else {
      console.log("Nenhum peso médio encontrado");
      res.status(404).json({ message: "Nenhum peso médio encontrado" });
    }
  } catch (error) {
    console.error("Erro ao buscar peso médio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para simular um novo peso médio (apenas para testes)
app.post("/api-weight/simulate-average", async (req, res) => {
  try {
    const { weight, samples, status } = req.body;

    // Criar um novo registro de peso estável
    const stableWeight = new StableWeight({
      weight: Number(weight || 350),
      samples: Number(samples || 5),
      status: status || "aprovado",
      timestamp: new Date(),
    });

    // Salvar no banco de dados
    await stableWeight.save();

    console.log("Peso médio simulado salvo:", stableWeight);

    res.status(201).json({
      success: true,
      message: "Peso médio simulado salvo com sucesso",
      data: stableWeight,
    });
  } catch (error) {
    console.error("Erro ao simular peso médio:", error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor de exibição de peso médio rodando na porta ${PORT}`);
  console.log(
    `Acesse http://localhost:${PORT}/api-weight/latest-average para ver o último peso médio`
  );
});
