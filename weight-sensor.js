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

// Função para enviar dados para o servidor
async function sendWeightData(weight) {
  try {
    console.log("Enviando peso para o servidor:", weight);

    const serverPort = process.env.PORT || 17000; // Alterado para 17000 para corresponder ao servidor

    // Usar a nova rota que não depende do banco de dados
    const response = await fetch(
      `http://localhost:${serverPort}/update-weight`,
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

// Evento quando a porta serial é aberta
port.on("open", () => {
  console.log("Conexão serial aberta na porta COM3");
});

// Evento para tratar erros
port.on("error", (err) => {
  console.error("Erro na porta serial:", err.message);
});

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
    }
  }
});

// Função para enviar o último peso conhecido periodicamente
function sendPeriodicWeight() {
  if (lastWeight !== 0) {
    console.log("Enviando peso periódico:", lastWeight);
    sendWeightData(lastWeight);
  }

  // Agendar próximo envio em 1 segundo
  setTimeout(sendPeriodicWeight, 1000);
}

// Iniciar o envio periódico após 5 segundos (para dar tempo de receber a primeira leitura)
setTimeout(sendPeriodicWeight, 5000);

console.log("Iniciando leitura do sensor de peso...");
