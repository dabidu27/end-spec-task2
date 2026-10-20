import type { FastifyRequest, FastifyReply } from "fastify";
import supabase from "../utils/db.js";

const difficulties: Set<string> = new Set<string>()
difficulties.add('easy');
difficulties.add('medium');
difficulties.add('hard')

interface CreateQuestBody{
    title?: unknown,
    difficulty?: unknown,
    due_date?:unknown,
    recurrence?: unknown
}

export const isValidDateFormat = (date: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const day = Number(date.slice(8, 10));
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    return parsedDate.getUTCFullYear() === year
        && parsedDate.getUTCMonth() === month - 1
        && parsedDate.getUTCDate() === day;
};

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