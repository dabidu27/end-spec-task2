import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserData } from "../utils/completion.js";
import { isValidTimezone } from "../utils/date.js";
import supabase from "../utils/db.js";
import { computeStreak } from "../utils/completion.js";

export const getMe = async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const userData = await getUserData();
        if (!userData) {
            return res.code(500).send({error: "Internal server error"});
        }
        
        //Recompute streak

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

interface UpdateTimezoneBody{
    timezone?: unknown
}
export const updateTimezone = async (req: FastifyRequest<{Body: UpdateTimezoneBody}>, res: FastifyReply) => {

    if(typeof req.body !== 'object' || req.body === null || Array.isArray(req.body))
        return res.code(400).send({error: 'invalid request body'})

    const {timezone} = req.body;
    if(typeof timezone !== 'string' || !isValidTimezone(timezone))
        return res.code(400).send({error: 'invalid timezone'});

    let userId = null;
    try{
        const userData = await getUserData();
        if (!userData) {
            return res.code(500).send({error: "Internal server error"});
        }
        userId = userData.id;

    }catch(err: any){
        console.log(err?.message)
        return res.code(500).send({error: 'Internal server error'})
    }

    try{
        const {data: updateData, error: updateError} = await supabase.from('me').update({'timezone': timezone}).eq('id', userId).select('timezone, xp, level, xp_into_level, xp_to_next_level, streak').maybeSingle();
        if(updateError)
            throw new Error('Internal server error');
        if(!updateData)
            throw new Error('No user data')
        
        return res.code(200).send(updateData)
    }catch(err:any){
        console.log(err.message);
        return res.code(500).send({error: 'Internal server error'});
    }
    
}