import sensorData from "../models/sensorModel.js"

class sensorService {
    static async saveSensorData(data){
        try {
            const {product_id, weight, movement, timestamp} = data

            if(!product_id || weight === undefined || movement === undefined || !timestamp){
                throw new Error("Dados incompletos ou inválidos! ")
            }

            const newSensorData = new sensorData ({
                product_id,
                weight,
                movement,
                timestamp: new Date(timestamp)
            })
            await newSensorData.save()
            return newSensorData
        } 
        catch (error) {
            throw error
        }
    }

    static async getAllSensorData(){
        try {
            const sensorData = await sensorData.find()
            return sensorData
        } 
        catch (error) {
           throw error 
        }
    }
}

export default sensorService