import type { FastifyRequest, FastifyReply } from "fastify";
import supabase from "../utils/db.js";
import { isValidDateFormat, getDateInTimezone } from "../utils/date.js";
import { getBaseXP, difficulties, getUserData, getQuestAndCompletion, computeLevelAndXpUpdate, computeStreak } from "../utils/completion.js";
import type { CompletionData } from "../utils/completion.js";


interface CreateQuestBody{
    title?: unknown,
    difficulty?: unknown,
    due_date?:unknown,
    recurrence?: unknown
}

const DEFAULT_TIMEZONE = 'Europe/Bucharest';


export const createQuest = async(req: FastifyRequest<{Body: CreateQuestBody}>, res: FastifyReply)=>{

    //validate that a body exists and it is in a good form, before destructuring
    if(typeof req.body !== 'object' || req.body === null || Array.isArray(req.body))
        return res.code(400).send({error: 'invalid request body'})
    //deconstruct the body
    const {title , difficulty, due_date, recurrence} = req.body;
    //validate title - mandatory to be present and non-empty
    if(typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 100)
        return res.code(400).send({error: 'invalid title'})

    //validate difficulty - mandatory to be present
    //and also mandatory to be only easy, medium, hard - deduced from recordings - this also takes care of '' difficulty
    if(typeof difficulty !== 'string' || !difficulties.has(difficulty))
        return res.code(400).send({error: 'invalid difficulty'})

    if (due_date !== undefined) {
        if (typeof due_date !== "string" || !isValidDateFormat(due_date)) {
            return res.code(400).send({ error: "invalid due date" });
        }
    }

    if (recurrence !== undefined) {
        if (typeof recurrence !== "string" || recurrence !== "daily") {
            return res.code(400).send({ error: "invalid recurrence" });
        }
    }

    //validate that we only have due_date or only have reccurence
    if(due_date !== undefined && recurrence !== undefined)
        return res.code(400).send({error: 'a quest cannot have both due_date and recurrence'});

    //get creation time from X-Now header - if it does not exist, use the date today - timestamptz
    const createdAt = req.headers['x-now'] ?? new Date().toISOString();

    //save to db
    try{
        const {data, error} = await supabase.from('quests').insert({'created_at': createdAt, 'title': title.trim(), 'difficulty': difficulty, 'due_date': due_date, 'recurrence': recurrence}).select().single() //done is by default false in the db
        if(error){
            console.log(error?.message);
            return res.code(500).send({error: 'Internal server error'});
        }

        if(!data){
            return res.code(500).send({error: 'Internal server error'});
        }

        return res.code(201).send({id: data.id, title: data.title, difficulty: data.difficulty, due_date: data.due_date, recurrence: data.recurrence, done: data.done})

    }catch(err: any){
        console.log(err.message);
        return res.code(500).send({error: 'Internal server error'})
    }

}

export const getAllQuests = async(req: FastifyRequest, res: FastifyReply) => {

    try{
        const {data, error} = await supabase
            .from('quests')
            .select('id, title, difficulty, due_date, recurrence, done, created_at')
            .order('created_at', {ascending: false});
        if(error){
            console.log(error?.message);
            return res.code(500).send({error: 'Internal server error'});
        }
        
        //sort to make sure they are ordrered
        const quests = (data ?? [])
            .sort(
                (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
            )
            .map(({ created_at: _createdAt, ...quest }) => quest);

        return res.code(200).send(quests);

    }catch(err: any){
        console.log(err.message);
        return res.code(500).send({error: 'Internal server error'});
    }
}

//extract id
//check if quest exists, get its completions
//get user data
//compute today in user timezone
//no completions => first completion => valid
//one-off vs recurrent: one-off => check if already completed today - if completed, do not add xp, do not add level, just return
                                                                //if not completed, compute xp based on due-date
                        //recurent => check if already completed today - if completed, can complete again, but apply penalty on xp
                                    //not completed => complete and add full xp
//compute streak: get all completions - any other today => keep user streak
                                    //no completion today => check yesterday: yes => user streak + 1, no => streak = 1 (reset)

export const completeQuest = async(req: FastifyRequest<{Params: {id: string}}>, res: FastifyReply) => {

    //Extract id param
    const id = req.params.id;
    if(id === undefined)
        return res.code(400).send({error: 'missing id'});

    //Get user data
    let userData = null;
    try{
        userData = await getUserData();
    }catch(err: any){
        return res.code(500).send({error: 'Internal server error'})
    }

    const userId = userData.id;
    userData = {timezone: userData.timezone, xp: userData.xp, xp_into_level: userData.xp_into_level, xp_to_next_level: userData.xp_to_next_level, level: userData.level, streak: userData.streak}

    //Compute day in local timezone
    //normalize header as it can be an array and we cannot split on it
    const nowHeader = req.headers["x-now"];
    const now = Array.isArray(nowHeader) ? nowHeader[0] : nowHeader;

    const currentTimestamp = now ?? new Date().toISOString();

    const timezone = userData.timezone ?? DEFAULT_TIMEZONE;
    let todayDate: string;
    try {
        todayDate = getDateInTimezone(currentTimestamp, timezone);
    } catch (error: any) {
        return res.code(500).send({error: 'Internal server error'});
    }

    //Check if quest exists and extract its completion data
    const result = await getQuestAndCompletion(id);
    if(result.error)
        return res.code(result.status).send({error: result.error})
    
    const {questData, completionData} = result;
    const oneOff = questData.recurrence === null;

    //If no completion today, the completion is valid, only adds base xp for now - will add bonus later
    let addXp = 0;
    let baseXp = difficulties.get(questData.difficulty) ?? 0;
    let returnedCompletion = null;
    let completionToday = completionData.some((c: CompletionData) => c.day === todayDate)


    //If the request is oneOff, any completion, not just today, invalidates the one today
    if(oneOff && completionData.length > 0){
        returnedCompletion = completionData[0];
        addXp = 0;
    }else if (completionData.length === 0){
        //If there is no completion, the new compliation is valid
        addXp = baseXp;
        //But we apply a penalty on the XP if it's past the due data
        if(questData.due_date && todayDate > questData.due_date)
            addXp = Math.floor(addXp/2);
    }else if (!oneOff){ //If it's a recurrent quest
        //It is invalidated only by a completion today
        if(!completionToday){
            addXp = baseXp;
        }else{ //If we already have completions today, we will add 0 xp and return the last completion (do not add) and 0 xp
            returnedCompletion = completionData[0];
            addXp = 0;
        }
    }
    
    //returnedCompletion === null => we have to add completion

    //Compute streak, based on completions for all quests
    let newStreak = 0;
    let globalCompletionToday = true;
    try{
        ({globalCompletionToday, newStreak} = await computeStreak(userData.streak, todayDate));
    }catch(err){
        return res.code(500).send({error: 'Internal server error'})
    }

    try{
        let status = 200;

        //If a new comlpetion is to be added, add it and update user
        let updateMe = userData;
        if(!returnedCompletion){
            status = 201;
            const {data: insertCompletion, error: insertCompletionError} = await supabase.from('completions').insert({'quest_id': id, day: todayDate, 'base_xp': addXp, 'created_at': now ?? new Date().toISOString()}).select().single();
            if(insertCompletionError || !insertCompletion)
                throw new Error('Internal server error');
            returnedCompletion = insertCompletion;

            //Also update the done column in quests
            const {error: updateQuestError} = await supabase
                .from('quests')
                .update({done: true})
                .eq('id', id);
            if(updateQuestError)
                throw new Error('Internal server error');

            //Compute newXp and Level, after multiplying the addXp by the streak bonus
            const streakBonus = globalCompletionToday ? 0 : Math.min(newStreak, 7) * 2;
            const awardedXp = addXp + streakBonus;
            const {currXp, currXpInLevel, nextLevelXp, currLevel} = computeLevelAndXpUpdate(awardedXp, userData.xp, userData.xp_into_level, userData.xp_to_next_level, userData.level)

            //Update user
            const {data: updateData, error: updateMeError} = await supabase.from('me').update({'xp': currXp, 'xp_into_level': currXpInLevel, 'xp_to_next_level': nextLevelXp, 'level': currLevel, 'streak': newStreak}).eq('id', userId).select('timezone, xp, level, xp_into_level, xp_to_next_level, streak').single();
            if(updateMeError)
                throw new Error('Internal server error');
            updateMe = updateData;
        }

        returnedCompletion.created_at = new Date(
            returnedCompletion.created_at,
        ).toISOString().replace(".000Z", "Z"); //supabase returns the value as 2026-10-05T06:15:00+00:00 instead of 2026-10-05T06:15:00Z
            
        return res.code(status).send({completion: returnedCompletion, me: updateMe})

    }catch(error){
        return res.code(500).send({error: 'Internal server error'})
    }
}