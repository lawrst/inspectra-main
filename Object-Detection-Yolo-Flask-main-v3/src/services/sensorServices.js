import mongoose from "mongoose";
import sensorDataSchema from "../models/sensorModel.js";

// Cria o modelo se ainda não existir
const SensorData =
  mongoose.models.SensorData || mongoose.model("SensorData", sensorDataSchema);

class sensorService {
  static async saveSensorData(data) {
    try {
      const { product_id, weight, movement, timestamp } = data;

      if (
        !product_id ||
        weight === undefined ||
        movement === undefined ||
        !timestamp
      ) {
        throw new Error("Dados incompletos ou inválidos!");
      }

      const newSensorData = new SensorData({
        product_id,
        weight,
        movement,
        timestamp: new Date(timestamp),
      });

      await newSensorData.save();
      console.log("Dados salvos no banco:", newSensorData);
      return newSensorData;
    } catch (error) {
      console.error("Erro ao salvar dados do sensor:", error);
      throw error;
    }
  }

  static async getAllSensorData() {
    try {
      const sensorData = await SensorData.find().sort({ timestamp: -1 });
      return sensorData;
    } catch (error) {
      throw error;
    }
  }

  static async getLatestSensorData() {
    try {
      // Busca o registro mais recente
      const latestData = await SensorData.findOne().sort({ timestamp: -1 });
      console.log("Dados mais recentes encontrados:", latestData);

      // Se não encontrar dados, retorna um objeto padrão
      if (!latestData) {
        console.log("Nenhum dado encontrado, retornando valor padrão");
        return { weight: 0, timestamp: new Date().toISOString() };
      }

      return {
        weight: latestData.weight,
        timestamp: latestData.timestamp,
        product_id: latestData.product_id,
        movement: latestData.movement,
      };
    } catch (error) {
      console.error("Erro ao buscar dados mais recentes:", error);
      // Em caso de erro, retorna um objeto padrão
      return {
        weight: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}

export default sensorService;
