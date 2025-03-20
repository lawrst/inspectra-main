import express from "express";
import sensorService from "../services/sensorServices.js";

const weightRoute = express.Router();

// Rota para obter os dados mais recentes do sensor de peso
weightRoute.get("/latest-weight", async (req, res) => {
  try {
    console.log("Requisição recebida para /api-weight/latest-weight");
    const latestData = await sensorService.getLatestSensorData();
    console.log("Enviando dados mais recentes para o cliente:", latestData);
    res.status(200).json(latestData);
  } catch (error) {
    console.error("Erro ao buscar dados recentes do sensor:", error);
    res
      .status(500)
      .json({ error: error.message || "Erro interno do servidor.", weight: 0 });
  }
});

export default weightRoute;
