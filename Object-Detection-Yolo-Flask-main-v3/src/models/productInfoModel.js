import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  product_id: { type: String, required: true }, // ID do produto
  timestamp: { type: Date, default: Date.now }, // Data e hora da inspeção
  status: { type: String, enum: ["intacto", "defeito"], required: true }, // Status do produto
});

const Product = mongoose.model("Product", productSchema);

export default Product;
