import type { FastifyPluginAsync } from "fastify";
import { getMe } from "../controllers/meController.js";

const meRoutes: FastifyPluginAsync = async (app) => {
    app.get('/', getMe);
}

export default meRoutes