import Fastify from "fastify";
import cors from "@fastify/cors";
import questRoutes from "./routes/questRoutes.js";
import meRoutes from "./routes/meRoutes.js";
import completionRoutes from "./routes/completionRoutes.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { deleteTable, resetUser } from "./utils/completion.js";

//register app
const app = Fastify({logger: true})

//enable cors
await app.register(cors, {origin: 'http://localhost:3000'});

app.get('/health', async () => {
    return {status: 'ok'}
})

app.post('/test/reset', async (req: FastifyRequest, res: FastifyReply) => {
    try{

        //Sequentially await all deletions, do not use PromiseAll, as we have a fk with restrict between quests and competions - with PromiseAll, we might try to delete a quests who still has undeleted completions
        await deleteTable('completions');
        await deleteTable('quests');
        await resetUser();

        return res.code(204).send();
    }catch(err: any){
        console.log(err.message);
        return res.code(500).send({error: 'Internal server error'})
    }
})

app.register(questRoutes, {prefix: '/api/quests'})
app.register(meRoutes, {prefix: '/api/me'})
app.register(completionRoutes, {prefix: '/api/completions'})

//start server
try{
    await app.listen({port: 3001, host: '0.0.0.0'});
}catch(err){
    app.log.error(err);
}
