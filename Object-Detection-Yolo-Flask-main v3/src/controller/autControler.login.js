import bcrypt from 'bcrypt'
import {loginService, generateToken} from "../services/aut.service.js"

const login = async (req,res) => {
    try {
        const {email, senha} = req.body

        const user = await loginService(email)

        if(!user){
            return res.status(404).send({msg:"senha ou usuario incorreto!"})
        }

        const senhaIsValid = bcrypt.compareSync(senha, user.senha)

        if(!senhaIsValid){
            return res.status(404).send({msg:"senha ou usuario incorreto!"})
        }

        const token = generateToken(user.id)

        res.send({token})

    }
     catch (error) {
       return res.status(500).send(error.message)
    }

    

}
export {login}