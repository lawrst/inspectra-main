import express from "express";
import sensorController from "../controller/sensorController.js";

const routeData = express.Router();

// Rota para enviar dados do sensor
routeData.post("/sensorData", sensorController.postSensorData);

// Rota para obter todos os dados do sensor
routeData.get("/sensorData", async (req, res) => {
  try {
    console.log("Requisição GET para /api-sensor/sensorData");
    const data = await sensorController.getSensorData(req, res);
    return data;
  } catch (error) {
    console.error("Erro ao buscar dados do sensor:", error);
    return res
      .status(500)
      .json({ error: error.message || "Erro interno do servidor." });
  }
});

export default routeData;
