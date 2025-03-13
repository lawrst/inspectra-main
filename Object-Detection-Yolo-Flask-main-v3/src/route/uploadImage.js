import express from "express"
import UploadImageController from "../controller/uploadImageController.js"

const router = express.Router();

router.post("/up-image",UploadImageController.postImageData);

router.get("/up-image/:productId", UploadImageController.getImagesByProductId);

export default router;