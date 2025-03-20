import express from "express";
import VideoDetectionController from "../controller/videoDetectionController.js";

const router = express.Router();

// Rota para processar um frame de vídeo
router.post("/process-video-frame", VideoDetectionController.processVideoFrame);

// Rota para salvar uma detecção de vídeo
router.post(
  "/save-video-detection",
  VideoDetectionController.saveVideoDetection
);

export default router;
