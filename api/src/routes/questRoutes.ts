import type {FastifyPluginAsync} from 'fastify'
import { createQuest } from '../controllers/questController.js';
const questRoutes: FastifyPluginAsync = async (app) =>{

    app.post('', createQuest)
}

export default questRoutes;