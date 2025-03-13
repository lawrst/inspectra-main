import ProductInfo from "../models/productInfoModel.js";

class ProductInfoService {
    // Salva as informações do produto no banco de dados
    static async saveProductInfo(data) {
        try {
            const { product_id, name, description, weight, movement } = data;

            // Validação básica
            if (!product_id || !name) {
                throw new Error("Dados incompletos ou inválidos.");
            }

            // Determina o status com base nos dados dos sensores
            let status = 'intacto'; // Status padrão
            if (weight < 1 || weight > 10) { // Exemplo de regra para defeito
                status = 'defeito';
            }
            if (movement === true) { // Exemplo de regra para defeito
                status = 'defeito';
            }


            // Cria um novo registro
            const newProductInfo = new ProductInfo({
                product_id,
                name,
                description,
                weight,
                movement,
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

    // Busca todos os produtos
    static async getAllProducts() {
        try {
            const products = await ProductInfo.find();
            return products;
        } catch (error) {
            throw error;
        }
}}
export default ProductInfoService