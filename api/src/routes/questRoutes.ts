import type {FastifyPluginAsync} from 'fastify'
import { createQuest, getAllQuests } from '../controllers/questController.js';
const questRoutes: FastifyPluginAsync = async (app) =>{

    app.post('', createQuest)
    app.get('', getAllQuests)
}

export default questRoutes;