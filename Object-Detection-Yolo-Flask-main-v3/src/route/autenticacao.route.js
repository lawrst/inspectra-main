import { Router } from "express"
const router = Router()
import {login} from "../controller/autControler.login.js"
router.post("/",login )

export default router