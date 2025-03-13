import mongoose from "mongoose"

const sensorDataSchema = new mongoose.Schema({
    product_id: {type: String, required: true},
    weight: {type: Number, required: true},
    movement: { type: Boolean, required: true},
    timesramp: {type: Date, requered: true},

})

export default sensorDataSchema