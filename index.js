// ARQUIVO PRINCIPAL, SERVIDOR  

import express from "express"
import connectDataBase from "./Object-Detection-Yolo-Flask-main v3/src/databse/banco.js"
import sensorDataRoute from"./Object-Detection-Yolo-Flask-main v3/src/route/sensorData.js"
import productInfoRoute from "./Object-Detection-Yolo-Flask-main v3/src/route/productInfoRoute.js"
import uploadImageRoute from "./Object-Detection-Yolo-Flask-main v3/src/route/uploadImage.js"


import userRoute from "./Object-Detection-Yolo-Flask-main v3/src/route/route.js"
import autRoute from "./Object-Detection-Yolo-Flask-main v3/src/route/autenticacao.route.js"

import dotenv from "dotenv"
dotenv.config()
import cors from "cors";


const app = express()

const port = process.env.PORT || 18000

app.use(cors({
    //origin: "http://127.0.0.1:5500", // Permite apenas requisições desse domínio
    methods: "GET,POST,PUT,DELETE", // Define os métodos HTTP permitidos
    allowedHeaders: "Content-Type,Authorization" // Define os headers permitidos
}));


connectDataBase()
app.use(express.json())
app.use("/user",userRoute)
app.use("/autenticacao",autRoute)

app.use('/api-sensor', sensorDataRoute)
app.use('/api-info',productInfoRoute)
app.use('/api-image',uploadImageRoute)


app.listen(port, () => console.log('Servidor Rodando'))
