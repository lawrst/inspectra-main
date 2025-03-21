// Este é um servidor proxy para redirecionar as requisições entre o servidor Python e o Node.js
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";

const app = express();
const PORT = 3000;

// Habilitar CORS
app.use(cors());

// Configurar proxy para o servidor Python (app.py)
const pythonProxy = createProxyMiddleware({
  target: "http://localhost:5000", // Porta padrão do Flask
  changeOrigin: true,
  pathRewrite: {
    "^/python": "", // Remove o prefixo '/python' antes de encaminhar para o servidor Python
  },
  logLevel: "debug",
});

// Configurar proxy para o servidor Node.js (index.js)
const nodeProxy = createProxyMiddleware({
  target: "http://localhost:18000", // Porta do servidor Node.js
  changeOrigin: true,
  pathRewrite: {
    "^/node": "", // Remove o prefixo '/node' antes de encaminhar para o servidor Node.js
  },
  logLevel: "debug",
});

// Redirecionar rotas específicas para o servidor Node.js
app.use("/api-weight", nodeProxy);
app.use("/current-weight", nodeProxy);
app.use("/update-weight", nodeProxy);
app.use("/pesagem", nodeProxy);

// Redirecionar todas as outras rotas para o servidor Python
app.use("/", pythonProxy);

app.listen(PORT, () => {
  console.log(`Servidor proxy rodando na porta ${PORT}`);
  console.log(`Redirecionando para Python: http://localhost:5000`);
  console.log(`Redirecionando para Node.js: http://localhost:18000`);
});
