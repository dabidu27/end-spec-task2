import type { FastifyPluginAsync } from "fastify";
import { getAllCompletions } from "../controllers/completionController.js";

const completionRoutes: FastifyPluginAsync = async(app) =>{
    app.get('/', getAllCompletions)
}

export default completionRoutes