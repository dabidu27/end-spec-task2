import Fastify from "fastify";
import cors from "@fastify/cors";
import questRoutes from "./routes/questRoutes.js";
import meRoutes from "./routes/meRoutes.js";
import completionRoutes from "./routes/completionRoutes.js";

//register app
const app = Fastify({logger: true})

//enable cors
await app.register(cors, {origin: 'http://localhost:3000'});

app.get('/health', async () => {
    return {status: 'ok'}
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
