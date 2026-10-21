import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserData } from "../utils/completion.js";

export const getMe = async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const userData = await getUserData();
        if (!userData) {
            return res.code(500).send({error: "Internal server error"});
        }

        return res.code(200).send({
            timezone: userData.timezone,
            xp: userData.xp,
            level: userData.level,
            xp_into_level: userData.xp_into_level,
            xp_to_next_level: userData.xp_to_next_level,
            streak: userData.streak,
        });
        
    } catch {
        return res.code(500).send({error: "Internal server error"});
    }
};