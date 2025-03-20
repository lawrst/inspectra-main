import UploadImageService from "../services/upImageService.js";

class UploadImageController {
  // Salva a URL da imagem
  static async postImageData(req, res) {
    try {
      const data = req.body;

      // Chama o serviço para salvar os dados
      const savedImageData = await UploadImageService.saveImageData(data);

      // Responde com sucesso
      res.status(201).json({
        message: "Imagem salva com sucesso!",
        data: savedImageData,
      });
    } catch (error) {
      console.error("Erro ao salvar imagem:", error);
      res
        .status(500)
        .json({ error: error.message || "Erro interno do servidor." });
    }
  }

  // Retorna todas as imagens de um produto pelo ID
  static async getImagesByProductId(req, res) {
    try {
      const { productId } = req.params;

      // Chama o serviço para buscar os dados
      const images = await UploadImageService.getImagesByProductId(productId);

      // Responde com os dados
      res.status(200).json(images);
    } catch (error) {
      console.error("Erro ao buscar imagens do produto:", error);
      res
        .status(500)
        .json({ error: error.message || "Erro interno do servidor." });
    }
  }
}

export default UploadImageController;
