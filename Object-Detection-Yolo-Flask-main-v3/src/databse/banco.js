import mongoose from "mongoose"

const connectDatabase = () =>{

    mongoose.connect(process.env.BANCODEDADOS,{useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log("MongoDb Conectado"))
    .catch((error) => console.log(error))
}


export default connectDatabase