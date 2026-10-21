import type { FastifyPluginAsync } from "fastify";
import { getAllCompletions, deleteCompletion } from "../controllers/completionController.js";

const completionRoutes: FastifyPluginAsync = async(app) =>{
    app.get('/', getAllCompletions)
    app.delete('/:id', deleteCompletion)
}

export default completionRoutes