// Script para ler dados do sensor de peso Arduino
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import fetch from "node-fetch";

// Configuração da porta serial
const port = new SerialPort({
  path: "COM3",
  baudRate: 57600,
});

// Configuração do parser para ler linha por linha
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

// Variável para armazenar o último valor de peso lido
let lastWeight = 0;

// Variáveis para controle de estabilidade
let stableWeight = null;
let stableStartTime = null;
const STABILITY_THRESHOLD = 2.0; // Margem de erro de 2g
const STABILITY_DURATION = 5000; // 5 segundos em milissegundos

// Array para armazenar os pesos durante o período de estabilidade (um por segundo)
let weightSamples = [];
let lastSampleTime = 0;
const SAMPLE_INTERVAL = 1000; // Intervalo de 1 segundo entre amostras

// Atualizar a porta e a rota para enviar os dados do peso
async function sendWeightData(weight) {
  try {
    console.log("Enviando peso para o servidor:", weight);

    // Usar a porta 18000 para evitar conflito com o servidor Python
    const serverPort = 18000;

    // Usar a nova rota específica
    const response = await fetch(
      `http://localhost:${serverPort}/api-weight/update-weight`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: weight,
        }),
      }
    );

    if (response.ok) {
      console.log("Dados de peso enviados com sucesso:", weight);
    } else {
      console.error("Erro ao enviar dados de peso:", await response.text());
    }
  } catch (error) {
    console.error("Erro na requisição:", error);
  }
}

// Função para verificar a estabilidade do peso
function checkWeightStability(weight) {
  const currentTime = Date.now();

  // Se não temos um peso estável ainda ou o peso mudou significativamente
  if (
    stableWeight === null ||
    Math.abs(weight - stableWeight) > STABILITY_THRESHOLD
  ) {
    // Reiniciar o monitoramento de estabilidade
    stableWeight = weight;
    stableStartTime = currentTime;
    weightSamples = []; // Limpar amostras anteriores
    lastSampleTime = 0; // Reiniciar o tempo da última amostra
    console.log("Iniciando monitoramento de estabilidade com peso:", weight);
    return false;
  }

  // Se o peso está dentro da margem de erro
  if (Math.abs(weight - stableWeight) <= STABILITY_THRESHOLD) {
    // Verificar se é hora de coletar uma nova amostra (a cada 1 segundo)
    if (currentTime - lastSampleTime >= SAMPLE_INTERVAL) {
      weightSamples.push(weight);
      lastSampleTime = currentTime;
      console.log(`Amostra #${weightSamples.length} coletada: ${weight}g`);
    }

    // Verificar se passou o tempo necessário (5 segundos)
    if (currentTime - stableStartTime >= STABILITY_DURATION) {
      // Garantir que temos pelo menos algumas amostras
      if (weightSamples.length > 0) {
        console.log(
          `Estabilidade atingida com ${weightSamples.length} amostras. Calculando média...`
        );
        return true;
      }
    }
  }

  return false;
}

// Função para calcular a média dos pesos
function calculateAverageWeight() {
  if (weightSamples.length === 0) return 0;

  const sum = weightSamples.reduce((acc, weight) => acc + weight, 0);
  const average = sum / weightSamples.length;

  console.log(
    `Média calculada: ${average.toFixed(2)}g a partir de ${
      weightSamples.length
    } amostras`
  );
  console.log(`Amostras: [${weightSamples.join(", ")}]`);

  return average;
}

// Atualizar a função saveStableWeight para ser mais resiliente a falhas
// Substituir a função saveStableWeight por:

// Atualizar a função saveStableWeight para ser mais resiliente a falhas
async function saveStableWeight(weight) {
  try {
    // Calcular a média dos pesos coletados durante o período de estabilidade
    const averageWeight = calculateAverageWeight();
    console.log(
      `Salvando peso estável no banco de dados (média: ${averageWeight.toFixed(
        2
      )}g)`
    );

    // Determinar o status com base no peso
    const status =
      averageWeight >= 300 && averageWeight <= 400 ? "aprovado" : "reprovado";

    // Configurar timeout para a requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

    try {
      const response = await fetch(
        `http://localhost:18000/api-weight/save-stable-weight`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weight: averageWeight,
            rawWeight: weight, // Peso original antes da média
            samples: weightSamples.length, // Número de amostras coletadas
            sampleData: weightSamples, // Enviar todas as amostras para depuração
            status: status,
            timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId); // Limpar o timeout se a requisição completar

      if (response.ok) {
        console.log("Peso estável salvo com sucesso no banco de dados");
        // Reiniciar o monitoramento de estabilidade
        stableWeight = null;
        stableStartTime = null;
        weightSamples = [];
        lastSampleTime = 0;
        return true;
      } else {
        const errorText = await response.text();
        console.error("Erro ao salvar peso estável:", errorText);
        return false;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error(
          "Timeout ao salvar peso estável - a requisição demorou muito"
        );
      } else {
        console.error(
          "Erro na requisição para salvar peso estável:",
          fetchError
        );
      }

      // Tentar salvar localmente através de uma rota alternativa
      try {
        console.log(
          "Tentando salvar localmente através de rota alternativa..."
        );
        await fetch(`http://localhost:18000/api-weight/save-local`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weight: averageWeight,
            samples: weightSamples.length,
            status: status,
            timestamp: new Date().toISOString(),
          }),
          // Sem timeout para esta requisição alternativa
        });
        console.log("Peso salvo localmente com sucesso");
      } catch (localError) {
        console.error("Falha também ao salvar localmente:", localError);
      }

      // Reiniciar o monitoramento de estabilidade mesmo em caso de erro
      stableWeight = null;
      stableStartTime = null;
      weightSamples = [];
      lastSampleTime = 0;
      return false;
    }
  } catch (error) {
    console.error("Erro ao salvar peso estável:", error);

    // Reiniciar o monitoramento de estabilidade mesmo em caso de erro
    stableWeight = null;
    stableStartTime = null;
    weightSamples = [];
    lastSampleTime = 0;
    return false;
  }
}

// Evento quando a porta serial é aberta
port.on("open", () => {
  console.log("Conexão serial aberta na porta COM3");
});

// Evento para tratar erros
port.on("error", (err) => {
  console.error("Erro na porta serial:", err.message);
});

// Remover completamente a verificação de estabilidade automática
// Substituir o evento de processamento de dados recebidos por esta versão simplificada:

// Evento para processar dados recebidos
parser.on("data", (data) => {
  console.log("Dados recebidos:", data);

  // Procura pelo padrão "Load_cell output val: X.XX"
  const match = data.match(/Load_cell output val: ([-\d.]+)/);

  if (match && match[1]) {
    const weight = Number.parseFloat(match[1]);

    // Verifica se o peso é um número válido
    if (!isNaN(weight)) {
      console.log("Peso lido:", weight);

      // Sempre envia o peso atual, mesmo que não tenha mudado
      lastWeight = weight;
      sendWeightData(weight);

      // Não verificamos mais a estabilidade automaticamente
      // O salvamento agora é controlado exclusivamente pelo botão na interface
    }
  }
});

// Substituir a função sendPeriodicWeight por esta versão simplificada:

// Função para enviar o último peso conhecido periodicamente
function sendPeriodicWeight() {
  if (lastWeight !== 0) {
    console.log("Enviando peso periódico:", lastWeight);
    sendWeightData(lastWeight);

    // Não verificamos mais a estabilidade automaticamente
    // O salvamento agora é controlado exclusivamente pelo botão na interface
  }

  // Agendar próximo envio em 1 segundo
  setTimeout(sendPeriodicWeight, 1000);
}

// Iniciar o envio periódico após 5 segundos (para dar tempo de receber a primeira leitura)
setTimeout(sendPeriodicWeight, 5000);

console.log("Iniciando leitura do sensor de peso...");
