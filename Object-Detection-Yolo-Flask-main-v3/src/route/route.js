import express from "express";
import userController from "../controller/user.controller.js";
//import {autController} from "../controller/autControler.login.js"
import { validID, validUser } from "../middlewares/global.middleware.js";
import Product from "../models/productInfoModel.js";

const route = express.Router();

//rota para criar usuarios
route.post("/", userController.create);

// rota login

// rota para pegar um elemento no banco
// id é o nome do parametro (nome,idade,cidade etc...)
route.get("/api-info", async (req, res) => {
  try {
    // Busca todos os produtos no banco de dados
    const products = await Product.find({});

    // Obtém parâmetros de paginação
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filtros de data
    const startDate = req.query.start_date
      ? new Date(req.query.start_date)
      : null;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

    // Constrói o filtro
    const filter = {};
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: startDate,
        $lte: new Date(endDate.setHours(23, 59, 59, 999)),
      };
    }

    // Busca produtos com paginação e filtros
    const data = await Product.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Conta produtos por status
    const intactCount = await Product.countDocuments({
      ...filter,
      status: "intacto",
    });
    const damagedCount = await Product.countDocuments({
      ...filter,
      status: "defeito",
    });

    // Formata os dados para o frontend
    const formattedData = data.map((product) => ({
      product_id: product.product_id,
      timestamp: product.timestamp.toISOString(),
      status: product.status,
      peso: product.weight || "N/A",
    }));

    // Retorna os dados em formato JSON
    res.json({
      data: formattedData,
      page,
      intact_count: intactCount,
      damaged_count: damagedCount,
    });
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    res.status(500).json({ error: "Erro ao buscar dados" });
  }
});

route.get("/", userController.findAll);
route.get("/:id", validID, validUser, userController.findById);
route.patch("/:id", validID, validUser, userController.update);

export default route;
