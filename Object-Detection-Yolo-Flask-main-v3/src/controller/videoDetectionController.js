import ProductInfoService from "../services/productInfoService.js"
import UploadImageService from "../services/upImageService.js"

class VideoDetectionController {
  // Processa um frame de vídeo para detecção
  static async processVideoFrame(req, res) {
    try {
      const { image, timestamp } = req.body

      if (!image) {
        return res.status(400).json({ error: "Imagem não fornecida" })
      }

      // Aqui normalmente você enviaria a imagem para um modelo de ML
      // Como não temos acesso ao modelo real, vamos simular uma detecção

      // Simulação de detecção (em produção, isso seria substituído pelo modelo real)
      const detected = Math.random() > 0.3 // 70% de chance de detectar algo

      if (detected) {
        // Simula um objeto detectado
        const status = Math.random() > 0.7 ? "defeito" : "intacto"
        const confidence = 0.75 + Math.random() * 0.2 // Entre 0.75 e 0.95

        return res.status(200).json({
          detected: true,
          processed_image: image, // Em produção, seria a imagem processada com as caixas de detecção
          objects: [
            {
              name: "Produto",
              status: status,
              confidence: confidence,
            },
          ],
          status: status,
          confidence: confidence,
        })
      } else {
        return res.status(200).json({
          detected: false,
          message: "Nenhum objeto detectado",
        })
      }
    } catch (error) {
      console.error("Erro ao processar frame de vídeo:", error)
      return res.status(500).json({ error: error.message || "Erro interno do servidor" })
    }
  }

  // Salva os dados de detecção de vídeo
  static async saveVideoDetection(req, res) {
    try {
      const { product_id, image_url, detected_objects, status, confidence, timestamp } = req.body

      if (!product_id || !detected_objects) {
        return res.status(400).json({ error: "Dados incompletos" })
      }

      // Salva a imagem
      const imageData = {
        product_id,
        image_url,
      }
      await UploadImageService.saveImageData(imageData)

      // Salva as informações do produto
      const productData = {
        product_id,
        status,
        timestamp: timestamp || new Date().toISOString(),
      }
      await ProductInfoService.saveProductInfo(productData)

      return res.status(201).json({
        message: "Detecção de vídeo salva com sucesso",
        product_id,
      })
    } catch (error) {
      console.error("Erro ao salvar detecção de vídeo:", error)
      return res.status(500).json({ error: error.message || "Erro interno do servidor" })
    }
  }
}

export default VideoDetectionController

