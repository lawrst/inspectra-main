import ProductInfo from "../models/productInfoModel.js";

class ProductInfoService {
  // Salva as informações do produto no banco de dados
  static async saveProductInfo(data) {
    try {
      const {
        product_id,
        name,
        description,
        weight,
        movement,
        status: inputStatus,
      } = data;

      // Validação básica
      if (!product_id) {
        throw new Error("ID do produto é obrigatório.");
      }

      // Determina o status com base nos dados dos sensores ou usa o status fornecido
      let status = inputStatus || "intacto"; // Usa o status fornecido ou o padrão

      // Se não houver status fornecido, determina com base nos sensores
      if (!inputStatus && (weight !== undefined || movement !== undefined)) {
        if (weight < 1 || weight > 10) {
          // Exemplo de regra para defeito
          status = "defeito";
        }
        if (movement === true) {
          // Exemplo de regra para defeito
          status = "defeito";
        }
      }

      // Cria um novo registro
      const newProductInfo = new ProductInfo({
        product_id,
        status,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      });

      // Salva no banco de dados
      await newProductInfo.save();
      return newProductInfo;
    } catch (error) {
      throw error;
    }
  }

  // Busca informações de um produto pelo ID
  static async getProductInfo(productId) {
    try {
      const productInfo = await ProductInfo.findOne({ product_id: productId });
      return productInfo;
    } catch (error) {
      throw error;
    }
  }

  // Busca todos os produtos com paginação e filtros
  static async getAllProducts(
    page = 1,
    limit = 20,
    startDate = null,
    endDate = null
  ) {
    try {
      const skip = (page - 1) * limit;

      // Construir filtro
      const filter = {};
      if (startDate && endDate) {
        filter.timestamp = {
          $gte: startDate,
          $lte: new Date(endDate.setHours(23, 59, 59, 999)),
        };
      }

      // Buscar produtos com paginação
      const products = await ProductInfo.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      // Formatar para o frontend
      return products.map((product) => ({
        product_id: product.product_id,
        timestamp: product.timestamp.toISOString(),
        status: product.status,
        peso: product.weight || "N/A",
      }));
    } catch (error) {
      throw error;
    }
  }

  // Conta produtos por status
  static async countByStatus(status, startDate = null, endDate = null) {
    try {
      const filter = { status };
      if (startDate && endDate) {
        filter.timestamp = {
          $gte: startDate,
          $lte: new Date(endDate.setHours(23, 59, 59, 999)),
        };
      }

      return await ProductInfo.countDocuments(filter);
    } catch (error) {
      throw error;
    }
  }
}

export default ProductInfoService;
