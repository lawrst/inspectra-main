import express from "express"
import productInfoController from "../controller/productInfoController.js"

const route = express.Router()

route.post("/postproduct", productInfoController.postProductInfo)

route.get("/product/:productId", productInfoController.getProductInfo)

route.get("/", productInfoController.getAllProducts)

export default route

