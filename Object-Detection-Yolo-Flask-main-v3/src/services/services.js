// Conexão com o banco
import User from "../models/User-model.js";

const createServices = (body) => User.create(body);
// find função do mongoose para buscar usuarios dentro do db
const findAllServices = () => User.find();
const findByIdService = (id) => User.findById(id);
const updateService = (id, name, username, email, senha) =>
  User.findOneAndUpdate({ _id: id }, { id, name, username, email, senha });

export default {
  createServices,
  findAllServices,
  findByIdService,
  updateService,
};
