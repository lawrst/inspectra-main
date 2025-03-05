import useServices from "../services/services.js"

/*const mongoose = require("mongoose") */

// Cadastro de usuarios
const create =  async (req, res) =>{

    try {

        const {name,username,email,senha} = req.body
        
        if (!name || !username || !email || !senha){
            res.status(400).send({mensagem:"Preencha todos os campos para registro!"})
        }
        
        const user =  await useServices.createServices(req.body)
        // verificação
        if(!user){
            return res.status(400).send({message: "Error ao criar usuario! "})
        }
        
        res.status(201).send({
            message:("dados recebidos"),
            user:{
                id: user._id,
                name,
                username,
                email,
                
            }
           
        })

    } 
    catch (error) {
       return res.status(500).send({msg:error.message})
    }

    
    
}

const findAll = async (req, res) => {
    try {
        const users = await useServices.findAllServices()

        if(users.length === 0){
            return res.status(400).send({messagen: "Não ha usuários cadastrados"})
        }
        res.send(users)
}
     catch (error) {
        return res.status(500).send({msg:error.message})
    }

}    

const findById = async (req, res) =>{
    // A requisição traz o user
    try {
        const user = req.user
        res.send(user)
    } 
    catch (error) {
       return res.status(500).send({msg:error.message})
    }
    
}

const update = async (req,res) => {
    try {
        const {name,username,email,senha} = req.body

        if (!name && !username && !email && !senha){
            res.status(400).send({mensagem:"Submeta pelo menos um campo para atualizar!"})
        }
    
        const {id,user} = req
    
    /*const user = await useServices.findByIdService(id)*/

        await useServices.updateService(
            id, name,username,email,senha,
        )
        return res.send({msg: "Usuario foi atualizado com sucesso! "})
        } 
    catch (error) {
       return res.status(500).send({msg:error.message})
    }
    
    
}

export default {
    create,findAll, findById, update,
}