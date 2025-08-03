import { check } from "express-validator";
import validateRequest from "../utils/validateRequest.js";



export const validateDashboardRoutes = [
    (req , res, next)=>validateRequest(req , res ,next)
]