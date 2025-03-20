import jwt from "jsonwebtoken";
import User from "../models/User-model.js";

const loginService = (email) => User.findOne({ email: email }).select("+senha");

// vai guardar a sessão do usuario _MD5 Hash_

const generateToken = (id) =>
  jwt.sign({ id: id }, process.env.SECRET_JWT, { expiresIn: 86400 });

export { loginService, generateToken };
