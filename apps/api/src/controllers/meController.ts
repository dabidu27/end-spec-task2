import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserData, isYesterday } from "../utils/completion.js";
import { isValidTimezone } from "../utils/date.js";
import supabase from "../utils/db.js";
import { getDateInTimezone } from "../utils/date.js";

const DEFAULT_TIMEZONE = 'Europe/Bucharest';


export const getMe = async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const userData = await getUserData();
        if (!userData) {
            return res.code(500).send({error: "Internal server error"});
        }

        const nowHeader = req.headers["x-now"];
        const now = Array.isArray(nowHeader) ? nowHeader[0] : nowHeader;

        const currentTimestamp = now ?? new Date().toISOString();
        const timezone = userData.timezone ?? DEFAULT_TIMEZONE
        let todayDate: string;
        try {
            todayDate = getDateInTimezone(currentTimestamp, timezone);
        } catch (error: any) {
            return res.code(500).send({error: 'Internal server error'});
        }
    
        //Recompute streak - if a user enters on the 17th without doing a comlpetion, and their last completion was 2 days ago (not day and not yesterday), the streak is lost - reset to 0
        //the next completion done will set the streak to 1

        let streak = userData.streak;
        const {data: lastCompletion, error} = await supabase.from('completions').select('*').order('created_at', {ascending: false}).limit(1).maybeSingle();
        if(error)
            throw new Error('Internal server error');
        
        console.log({ currentTimestamp, todayDate, lastDay: lastCompletion?.day, nowHeader });


        if(!lastCompletion || (lastCompletion.day !== todayDate && !isYesterday(lastCompletion.day, todayDate))){ //Streak is also 0 if there no completions
            const {error: userUpdateError} = await supabase.from('me').update({streak: 0}).eq('id', userData.id);
            if(userUpdateError)
                throw new Error('Internal server error');
            streak = 0;
        }

        return res.code(200).send({
            timezone: userData.timezone,
            xp: userData.xp,
            level: userData.level,
            xp_into_level: userData.xp_into_level,
            xp_to_next_level: userData.xp_to_next_level,
            streak: streak,
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