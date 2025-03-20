import ProductInfoService from "../services/productInfoService.js";
class ProductInfoController {
  // Salva as informações do produto
  static async postProductInfo(req, res) {
    try {
      const data = req.body;

      // Chama o serviço para salvar os dados
      const savedProductInfo = await ProductInfoService.saveProductInfo(data);

      // Responde com sucesso
      res.status(201).json({
        message: "Informações do produto salvas com sucesso!",
        data: savedProductInfo,
      });
    } catch (error) {
      console.error("Erro ao salvar informações do produto:", error);
      res
        .status(500)
        .json({ error: error.message || "Erro interno do servidor." });
    }
  }

  // Retorna as informações de um produto pelo ID
  static async getProductInfo(req, res) {
    try {
      const { productId } = req.params;

      // Chama o serviço para buscar os dados
      const productInfo = await ProductInfoService.getProductInfo(productId);

      if (!productInfo) {
        return res.status(404).json({ error: "Produto não encontrado." });
      }

      // Responde com os dados
      res.status(200).json(productInfo);
    } catch (error) {
      console.error("Erro ao buscar informações do produto:", error);

      return res
        .status(500)
        .json({ error: error.message || "Erro interno do servidor." });
    }
  }

  static async getAllProducts() {
    try {
      const products = await ProductInfoService.getAllProducts();

      res.status(200).json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default ProductInfoController;
