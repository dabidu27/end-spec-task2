import type {FastifyPluginAsync} from 'fastify'
import { createQuest, getAllQuests, completeQuest } from '../controllers/questController.js';
const questRoutes: FastifyPluginAsync = async (app) =>{

    app.post('', createQuest)
    app.get('', getAllQuests)
    app.post('/:id/complete', completeQuest)
}

export default questRoutes;