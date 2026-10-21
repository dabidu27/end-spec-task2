import { getUserData } from "../utils/completion.js";
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

//delete completion by id

//Get id
//Find completion
//Find the next completion
//Delete completion
//If there is another completion in the same day - keep streak and the xp stays the same
//If there was no other completion in the same day - streak has to be recomputed - the streak before stays, recompute running xp - the streak restarts at the next completion - recompute streak and add to running xp to get total xp
//Update user

export const deleteCompletion = async(req: FastifyRequest<{Params: {id: string}}>, res: FastifyReply) => {


    const id = req.params.id;
    if(id === undefined)
        return res.code(400).send({error: 'missing id'});

    try{
        const {data: allCompletions, error} = await supabase.from('completions').select('*').order('created_at', {ascending: false});
        if(error)
            throw new Error('Internal server error');

        if(allCompletions.length === 0)
            return res.code(404).send({error: 'completion not found'})

        const completionToDelete = allCompletions.find(c => c.id === id);
        if(!completionToDelete)
            return res.code(404).send({error: 'completion not found'})
        const completionsSameDay = allCompletions.filter(c => c.day === completionToDelete.day && c.id !== completionToDelete.id);
        const completionsBefore = allCompletions.filter(c => c.day < completionToDelete.day);
        const completionsAfter = allCompletions.filter (c => c.day > completionToDelete.day);

        //Get quest of completion
        const {data: questData, error: questError} = await supabase.from('quests').select('*').eq('id', completionToDelete.quest_id).maybeSingle();
        if(questError || !questData)
            throw new Error('Internal server error');
        
        //Find if it's one off
        const oneOffQuest = questData.recurrence === null;

        //Delete completion
        const {error: deleteError} = await supabase.from('completions').delete().eq('id', id);
        if(deleteError)
            throw new Error('Internal server error');

        //Update quest's done
        let newDone = true;
        if(oneOffQuest) //If the quest is one-off, it has only 1 completion => if we delete the completion, done becomes false
            newDone = false;
        else{ //If the quest is recurrent
            //Find if there are any other completions remaining for this quest
            const completionsForQuest = allCompletions.filter(c => c.quest_id === completionToDelete.quest_id && c.id !== completionToDelete.id);
            if(completionsForQuest.length === 0) //If no other completion found
                newDone = false; //done will be false
        }

        //Otherwise, done will remain true
        if(!newDone){
            const {error: updateQuestError} = await supabase.from('quests').update({done: false}).eq('id', completionToDelete.quest_id);
            if(updateQuestError)
                throw new Error('Internal server error');
        }

        //Get user data for xp, level, streak calculations
        const userData = await getUserData();

        let xp = userData.xp;
        let xpIntoLevel = userData.xp_into_level;
        let xpToNextLevel = userData.xp_to_next_level;
        let level = userData.level;
        let streak = userData.streak;

        //Update xp
        
        const otherCompletionsToday = completionsSameDay.length !== 0
        //If there are other completions today, the streak keeps going, the xp is only modified by subtracting the xp of the completion to delete
        //If not, we have to recompute
        if(!otherCompletionsToday){
            const remainingCompletions = [...completionsBefore, ...completionsSameDay, ...completionsBefore];
            //Sort from oldest to newest
            remainingCompletions.sort(
                (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime(),
            );
            
            xp = 0;
            xpIntoLevel = 0;
            xpToNextLevel = 0;
            level = 0;
            streak = 0;

            for(let i = 0; i < remainingCompletions.length; i++){
                if(remainingCompletions[i].day === remainingCompletions[i - 1].day){
                    xp += remainingCompletions[i].base_xp;
                }
            }
        }

    }catch(err){
        return res.code(500).send({error: 'Internal server error'});
    }
}