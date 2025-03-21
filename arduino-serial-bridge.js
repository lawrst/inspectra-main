// Arduino Serial Bridge - Connects Arduino to the web application
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const API_ENDPOINT = "http://localhost:18000/api-sensor"; // URL fixa para evitar problemas
const ARDUINO_BAUD_RATE = 57600; // Taxa fixa de 57600 baud

// Função para listar todas as portas seriais disponíveis
async function listSerialPorts() {
  try {
    const ports = await SerialPort.list();
    console.log("Portas seriais disponíveis:");
    ports.forEach((port, i) => {
      console.log(
        `${i + 1}. ${port.path} - ${port.manufacturer || "Desconhecido"}`
      );
    });
    return ports;
  } catch (err) {
    console.error("Erro ao listar portas seriais:", err.message);
    return [];
  }
}

// Função para encontrar a porta do Arduino
async function findArduinoPort() {
  const ports = await listSerialPorts();

  // Procura por portas que possam ser do Arduino
  const arduinoPorts = ports.filter((port) => {
    const manufacturer = (port.manufacturer || "").toLowerCase();
    return (
      manufacturer.includes("arduino") ||
      manufacturer.includes("wch") || // CH340 drivers
      manufacturer.includes("ftdi") || // FTDI drivers
      manufacturer.includes("silicon")
    ); // CP210x drivers
  });

  if (arduinoPorts.length > 0) {
    console.log(
      `Porta Arduino detectada automaticamente: ${arduinoPorts[0].path}`
    );
    return arduinoPorts[0].path;
  }

  // Se não encontrar, usa a porta especificada no .env ou uma porta padrão
  const defaultPort =
    process.env.ARDUINO_PORT ||
    (process.platform === "win32"
      ? "COM3"
      : process.platform === "darwin"
      ? "/dev/tty.usbmodem"
      : "/dev/ttyACM0");

  console.log(
    `Nenhuma porta Arduino detectada automaticamente. Usando porta padrão: ${defaultPort}`
  );
  return defaultPort;
}

// Função para enviar o peso para a API
async function sendCurrentWeight(weight) {
  try {
    console.log(`Enviando peso para API: ${weight}g`);

    const response = await fetch(`${API_ENDPOINT}/sensorData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: `WEIGHT-${Date.now()}`,
        weight: weight,
        movement: false,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("Erro na API:", response.status, await response.text());
    }

    // Também enviar para a nova rota específica
    try {
      await fetch("http://localhost:18000/api-weight/update-weight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: weight,
        }),
      });
    } catch (err) {
      console.error("Erro ao enviar para a rota específica:", err);
    }
  } catch (error) {
    console.error("Erro ao enviar dados de peso:", error);
  }
}

// Função para extrair o peso de diferentes formatos de dados
function extractWeight(data) {
  try {
    // Formato 1: "Load_cell output val: 123.45"
    if (data.includes("Load_cell output val:")) {
      const weightStr = data.split("Load_cell output val:")[1].trim();
      return Number.parseFloat(weightStr);
    }

    // Formato 2: "Weight: 123.45"
    if (data.includes("Weight:")) {
      const weightStr = data.split("Weight:")[1].trim();
      return Number.parseFloat(weightStr);
    }

    // Formato 3: "Peso: 123.45"
    if (data.includes("Peso:")) {
      const weightStr = data.split("Peso:")[1].trim();
      return Number.parseFloat(weightStr);
    }

    // Formato 4: "Current weight: 123.45"
    if (data.includes("Current weight:")) {
      const weightStr = data.split("Current weight:")[1].trim();
      return Number.parseFloat(weightStr);
    }

    // Formato 5: "Reading: 123.45"
    if (data.includes("Reading:")) {
      const weightStr = data.split("Reading:")[1].trim();
      return Number.parseFloat(weightStr);
    }

    // Formato 6: Apenas um número
    if (/^-?\d+(\.\d+)?$/.test(data.trim())) {
      return Number.parseFloat(data.trim());
    }

    // Formato 7: Procura por qualquer número no texto
    const matches = data.match(/-?\d+(\.\d+)?/);
    if (matches && matches.length > 0) {
      return Number.parseFloat(matches[0]);
    }

    return null; // Nenhum formato reconhecido
  } catch (err) {
    console.error("Erro ao extrair peso:", err.message);
    return null;
  }
}

// Função principal
async function main() {
  console.log("Iniciando Arduino Serial Bridge...");

  try {
    const portPath = await findArduinoPort();

    console.log(
      `Tentando conectar ao Arduino em ${portPath} com taxa de ${ARDUINO_BAUD_RATE} baud`
    );

    const port = new SerialPort({
      path: portPath,
      baudRate: ARDUINO_BAUD_RATE,
      autoOpen: true,
    });

    // Configura o parser
    const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    // Configura eventos
    port.on("open", () => {
      console.log(`Porta aberta com sucesso em ${ARDUINO_BAUD_RATE} baud`);

      // Envia um peso inicial de 0
      sendCurrentWeight(0);
    });

    // Variáveis para controlar o estado da calibração
    let waitingForTare = false;
    let waitingForWeight = false;

    // Processa dados do Arduino
    parser.on("data", async (data) => {
      try {
        console.log(`Dados recebidos: ${data}`);

        // Verifica se o Arduino está pedindo para enviar 't' para tare
        if (data.includes("Send 't'") && !waitingForTare) {
          console.log("Enviando 't' para calibrar a balança...");
          port.write("t\n");
          waitingForTare = true;
          return;
        }

        // Verifica se o Arduino está pedindo o peso conhecido
        if (
          (data.includes("send the weight") || data.includes("known mass")) &&
          !waitingForWeight
        ) {
          console.log("Enviando '395' como peso conhecido...");
          port.write("395\n");
          waitingForWeight = true;
          return;
        }

        // Extrai o peso dos dados
        const weight = extractWeight(data);

        // Verifica se o peso é válido
        if (weight !== null && !isNaN(weight)) {
          console.log(`Peso extraído: ${weight}g`);

          // Envia o peso para a API
          await sendCurrentWeight(weight);
        }
      } catch (error) {
        console.error("Erro ao processar dados do Arduino:", error);
      }
    });

    // Manipula erros
    port.on("error", (err) => {
      console.error("Erro na porta serial:", err.message);
      startSimulation();
    });

    // Manipula fechamento
    process.on("SIGINT", () => {
      console.log("Fechando conexão com a porta serial...");
      port.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("Erro ao conectar ao Arduino:", err.message);
    startSimulation();
  }
}

// Função para iniciar o modo de simulação
function startSimulation() {
  console.log("Iniciando modo de simulação...");

  // Simula dados de peso a cada 500ms
  let simulatedWeight = 0;
  let increasing = true;

  setInterval(async () => {
    // Simula um peso que varia entre 0 e 395g (o peso mencionado pelo usuário)
    if (increasing) {
      simulatedWeight += 10;
      if (simulatedWeight >= 395) {
        increasing = false;
      }
    } else {
      simulatedWeight -= 10;
      if (simulatedWeight <= 0) {
        increasing = true;
      }
    }

    console.log(`Peso simulado: ${simulatedWeight.toFixed(1)}g`);

    await sendCurrentWeight(simulatedWeight);
  }, 500);
}

// Inicia o programa
main().catch((err) => {
  console.error("Erro fatal:", err);
  startSimulation();
});
