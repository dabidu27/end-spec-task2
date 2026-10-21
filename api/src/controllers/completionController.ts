import { getUserData } from "../utils/completion.js";
import supabase from "../utils/db.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { isYesterday } from "../utils/completion.js";

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

        let totalXp = userData.xp;
        let xpIntoLevel = userData.xp_into_level;
        let xpToNextLevel = userData.xp_to_next_level;
        let level = userData.level;
        let streak = userData.streak;

        //Update xp
        //We recompute from beginning to end in both case (other completions today or not other completions today) - because in the other completions today case, we cannot just substract the basexp from the current total xp of the user, as it might have been affected by a streak
      
        const remainingCompletions = [...completionsBefore, ...completionsSameDay, ...completionsAfter];
        //Sort from oldest to newest
        remainingCompletions.sort(
            (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
        );
        
        totalXp = 0;
        streak = 0;

        for(let i = 0; i < remainingCompletions.length; i++){

            //If the same day as the one before, the streak is not modified, we just add the xp
            const previousCompletion = remainingCompletions[i - 1];
            if(previousCompletion && remainingCompletions[i].day === previousCompletion.day){
                totalXp += remainingCompletions[i].base_xp;
            }else{
                //If the 1 before is not on the same day, there are 2 possibilities: today's completion increases the streak, or 1 day was missed an the streak resets
                //here is also where we account for the first completion, that had previousCompletion undefined
                if(!previousCompletion || !isYesterday(previousCompletion.day, remainingCompletions[i].day)){
                    streak = 1;
                }else{
                    streak++;
                }

                const streakBonus = Math.min(streak, 7) * 2;
                totalXp += remainingCompletions[i].base_xp + streakBonus;
            }
        }

        //Transform totalXp into levels
        level = 1;
        xpIntoLevel = totalXp;
        xpToNextLevel = level * 100;
        while(xpIntoLevel >= xpToNextLevel){
            xpIntoLevel -= xpToNextLevel;
            level++;
            xpToNextLevel = level * 100;
        }
        xpToNextLevel -= xpIntoLevel;

        const userId = userData.id;
        //After recomputing, update the user
        const {error: updateUserError} = await supabase.from('me').update({xp: totalXp, xp_into_level: xpIntoLevel, xp_to_next_level: xpToNextLevel, level: level, streak: streak}).eq('id', userId);
        if(updateUserError)
            throw new Error('Internal Server Error');

        return res.code(204).send();

    }catch(err){
        return res.code(500).send({error: 'Internal server error'});
    }
}