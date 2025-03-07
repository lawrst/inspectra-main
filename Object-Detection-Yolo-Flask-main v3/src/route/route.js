import express from "express" 
import userController from "../controller/user.controller.js"
//import {autController} from "../controller/autControler.login.js"
import {validID,validUser} from "../middlewares/global.middleware.js"
import Product from "./models/ProductModel.js"; // Importe o modelo do produto

const route = express.Router()



//rota para criar usuarios
route.post("/", userController.create)

// rota login


// rota para pegar um elemento no banco
// id é o nome do parametro (nome,idade,cidade etc...)
router.get("/api-info", async (req, res) => {
    try {
        // Busca todos os produtos no banco de dados
        const products = await Product.find({});

        // Formata os dados para o frontend
        const formattedProducts = products.map(product => ({
            product_id: product.product_id,
            timestamp: product.timestamp.toISOString(), // Converte a data para ISO 8601
            status: product.status,
        }));

        // Retorna os dados em formato JSON
        res.json(formattedProducts);
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        res.status(500).json({ error: "Erro ao buscar dados" });
    }
});

route.get("/",userController.findAll)
route.get("/:id",validID,validUser,userController.findById)
route.patch("/:id",validID,validUser,userController.update)

export default route