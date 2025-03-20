import mongoose from "mongoose";

const imageDataSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  image_url: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default imageDataSchema;
