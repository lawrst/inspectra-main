import mongoose from "mongoose"

const productInfoSchema = new mongoose.Schema({
    product_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    weight: { type: Number },
    movement: { type: Boolean },
    status: {type: String, enum: ['intacto', 'defeito'], default: 'intacto'},
    defects: [{type: String}],
    timestamp: { type: Date, default: Date.now },
});

export default productInfoSchema