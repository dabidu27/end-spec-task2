import Fastify from "fastify";
import cors from "@fastify/cors";

//register app
const app = Fastify({logger: true})

//enable cors
await app.register(cors, {origin: 'http://localhost:3000'});

app.get('/health', async () => {
    return {status: 'ok'}
})

//start server
try{
    await app.listen({port: 3001, host: '0.0.0.0'});
}catch(err){
    app.log.error(err);
}
