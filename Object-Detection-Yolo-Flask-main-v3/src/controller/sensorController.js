import sensorService from "../services/sensorServices.js"



const postSensorData = async (req, res) => {
    try {
        const data = req.body;

        // Validação básica dos dados (exemplo)
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Dados inválidos ou ausentes." });
        }

        const saveData = await sensorService.saveSensorData(data);

        return res.status(201).json({ msg: "Dados dos sensores recebidos e armazenados com sucesso!", data: saveData });
    } catch (error) {
        console.error("Erro ao processar dados dos sensores: ", error);
        return res.status(500).json({ error: error.message || "Erro interno do servidor." });
    }
};

const getSensorData = async (req, res) => {
    try {
        const sensorData = await sensorService.getAllSensorData();

        return res.status(200).json(sensorData);
    } catch (error) {
        console.error("Erro ao buscar dados dos sensores:", error);
        return res.status(500).json({ error: error.message || "Erro interno do servidor." });
    }
};

export default {postSensorData, getSensorData}