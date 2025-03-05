import ImageData from "../models/imageDataModel.js";

class UploadImageService {
    // Salva a URL da imagem no banco de dados
    static async saveImageData(data) {
        try {
            const { product_id, image_url } = data;

            // Validação básica
            if (!product_id || !image_url) {
                throw new Error("Dados incompletos ou inválidos.");
            }

            // Cria um novo registro
            const newImageData = new ImageData({
                product_id,
                image_url,
            });

            // Salva no banco de dados
            await newImageData.save();
            return newImageData;
        } catch (error) {
            throw error;
        }
    }

    // Busca todas as imagens de um produto pelo ID
    static async getImagesByProductId(productId) {
        try {
            const images = await ImageData.find({ product_id: productId });
            return images;
        } catch (error) {
            throw error;
        }
    }
}

export default UploadImageService