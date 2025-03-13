// modelo de documentos
import mongoose from "mongoose"
import bcrypt from "bcryptjs"

// Verificação, 
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,

    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowecase: true
    },
    senha: {
        type: String,
        required: true,
        select: false
    }
})
// Função que cryptografa a senha 
UserSchema.pre("save", async function (next) {
    this.senha = await bcrypt.hash(this.senha, 10)
    next()
})

const User = mongoose.model("User",UserSchema)

export default User