// Este script cria uma ponte entre o servidor Python e o servidor Node.js
// para permitir que o servidor Python acesse os dados do sensor de peso
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = 17500; // Porta intermediária

// Habilitar CORS para permitir requisições de qualquer origem
app.use(
  cors({
    origin: "*",
    methods: "GET,POST",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// Middleware para processar JSON
app.use(express.json());

// Rota para obter o peso atual do servidor Node.js
app.get("/api-weight/current-weight", async (req, res) => {
  try {
    console.log("Recebida requisição para /api-weight/current-weight");

    // Fazer requisição para o servidor Node.js
    const response = await fetch(
      "http://localhost:18000/api-weight/current-weight"
    );

    if (!response.ok) {
      throw new Error(
        `Erro ao obter dados do servidor Node.js: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("Dados recebidos do servidor Node.js:", data);

    // Retornar os dados para o cliente
    res.status(200).json(data);
  } catch (error) {
    console.error("Erro na ponte API:", error);
    res.status(500).json({
      error: error.message,
      weight: 0,
      timestamp: new Date().toISOString(),
    });
  }
});

// Rota para atualizar o peso no servidor Node.js
app.post("/api-weight/update-weight", async (req, res) => {
  try {
    console.log("Recebida requisição para /api-weight/update-weight");

    // Fazer requisição para o servidor Node.js
    const response = await fetch(
      "http://localhost:18000/api-weight/update-weight",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Erro ao atualizar dados no servidor Node.js: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("Resposta do servidor Node.js:", data);

    // Retornar os dados para o cliente
    res.status(200).json(data);
  } catch (error) {
    console.error("Erro na ponte API:", error);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor de ponte API rodando na porta ${PORT}`);
  console.log(`Conectando ao servidor Node.js em http://localhost:18000`);
});
