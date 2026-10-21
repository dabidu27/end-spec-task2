import supabase from "../utils/db.js";
import type { FastifyRequest, FastifyReply } from "fastify";

export const getAllCompletions = async(req: FastifyRequest, res: FastifyReply)=>{

    try{
        const {data: allCompletions, error} = await supabase.from('completions').select('*').order('created_at', {ascending: false});
        if(error)
            throw new Error('Internal server error');
        //allCompletions is [] is no data
        return res.code(200).send(allCompletions)
    }catch(err){
        return res.code(500).send({error: 'Internal server error'});
    }



}