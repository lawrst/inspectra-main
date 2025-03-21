// Simulador de sensor de peso Arduino para testes
import express from "express";
import cors from "cors";

const app = express();
const PORT = 18001;

// Habilitar CORS e JSON
app.use(cors());
app.use(express.json());

// Variáveis para simulação
let currentWeight = 0;
let isIncreasing = true;
let isStable = false;
let stableWeight = 0;
let stableTimeout = null;

// Função para gerar um peso aleatório
function generateRandomWeight() {
  // Se estiver em modo estável, manter o peso com pequenas variações
  if (isStable) {
    // Pequena variação aleatória dentro da margem de erro (±1g)
    return stableWeight + (Math.random() * 2 - 1);
  }

  // Caso contrário, simular um peso que varia
  if (isIncreasing) {
    currentWeight += Math.random() * 5;
    if (currentWeight >= 350) {
      isIncreasing = false;

      // 50% de chance de entrar em modo estável
      if (Math.random() > 0.5) {
        enterStableMode();
      }
    }
  } else {
    currentWeight -= Math.random() * 5;
    if (currentWeight <= 10) {
      isIncreasing = true;
    }
  }

  return currentWeight;
}

// Função para entrar em modo estável
function enterStableMode() {
  console.log("Entrando em modo estável");
  isStable = true;
  stableWeight = currentWeight;

  // Permanecer estável por um período aleatório entre 10 e 20 segundos
  const stableDuration = 10000 + Math.random() * 10000;

  // Limpar qualquer timeout anterior
  if (stableTimeout) {
    clearTimeout(stableTimeout);
  }

  // Configurar novo timeout
  stableTimeout = setTimeout(() => {
    console.log("Saindo do modo estável");
    isStable = false;
  }, stableDuration);
}

// Rota para obter o peso atual
app.get("/api-weight/current-weight", (req, res) => {
  const weight = generateRandomWeight();

  res.status(200).json({
    weight: weight,
    timestamp: new Date().toISOString(),
    isStable: isStable,
  });
});

// Rota para atualizar o peso (apenas para testes)
app.post("/api-weight/update-weight", (req, res) => {
  const { weight } = req.body;

  if (weight !== undefined) {
    currentWeight = Number(weight);
    res.status(200).json({
      success: true,
      message: "Peso atualizado com sucesso",
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Peso não fornecido",
    });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Simulador de sensor de peso rodando na porta ${PORT}`);
  console.log(
    `Acesse http://localhost:${PORT}/api-weight/current-weight para ver o peso atual`
  );
});

// Imprimir o peso atual a cada segundo para depuração
setInterval(() => {
  const weight = generateRandomWeight();
  console.log(`Peso atual: ${weight.toFixed(2)}g (Estável: ${isStable})`);
}, 1000);
