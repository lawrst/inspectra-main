import express from "express" 
import sensorController from "../controller/sensorController.js"


const routeData = express.Router()

routeData.post("/sensorData", sensorController.postSensorData)
routeData.get("/sensorData", sensorController.getSensorData)

export default routeData