// ARQUIVO PRINCIPAL, SERVIDOR

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import connectDataBase from "./Object-Detection-Yolo-Flask-main-v3/src/databse/banco.js";
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

// Configuração para __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const port = process.env.PORT || 17000; // Alterado para 17000 para corresponder ao que está sendo acessado

// Variável global para armazenar o último peso lido
global.lastWeight = {
  weight: 0,
  timestamp: new Date().toISOString(),
};

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

connectDataBase();
app.use(express.json());
app.use("/user", userRoute);
app.use("/autenticacao", autRoute);

// Registrando as rotas da API
app.use("/api-sensor", sensorDataRoute);
app.use("/api-info", productInfoRoute);
app.use("/api-image", uploadImageRoute);
app.use("/api-weight", weightRoute);

// Rota direta para obter o peso atual (sem banco de dados)
app.get("/current-weight", (req, res) => {
  console.log(
    "Requisição para /current-weight, retornando:",
    global.lastWeight
  );
  res.status(200).json(global.lastWeight);
});

// Rota para receber o peso atual (sem banco de dados)
app.post("/update-weight", (req, res) => {
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
