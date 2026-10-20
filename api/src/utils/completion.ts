import supabase from "./db.js";

export const difficulties: Map<string, number> = new Map<string, number>()
difficulties.set('easy', 10);
difficulties.set('medium', 25);
difficulties.set('hard', 50);

export interface CompletionData{
    id: string,
    quest_id: string,
    day: string,
    base_xp: number,
    created_at: string
}


export function getBaseXP(difficulty: string): number{

    return difficulties.get(difficulty) ?? 0;

}

export async function getUserData(){
    const {data: meData, error: meError} = await supabase
        .from('me')
        .select('*')
        .maybeSingle();

    if (meError) {
        console.log(meError.message);
        throw new Error('Internal server error');
    }

    return meData;
}

export async function getQuestAndCompletion(id: string){

    let query = supabase.from('quests').select("*, completions(*)").eq('id', id).order('created_at', {foreignTable: 'completions', ascending: false}).maybeSingle();
    const{data: questData, error: questError} = await query

    if(questError){
        console.log(questError?.message);
        return {status: 500, error: 'Internal server error'}
    }

    if(!questData){
        return {status: 404, error: 'quest not found'}
    }

    let completionData = questData.completions; //will be [] if no entry for this competion

    return {questData, completionData};
}

export function computeLevelAndXpUpdate(addXp: number, currXp: number, currXpInLevel: number, nextLevelXp: number, currLevel: number){
    
    currXp += addXp;
    while(addXp >= nextLevelXp){
        addXp -= nextLevelXp;
        currLevel++;
        currXpInLevel = 0;
        nextLevelXp = currLevel * 100;
    }
    currXpInLevel += addXp;
    nextLevelXp -= addXp;

    return {currXp, currXpInLevel, nextLevelXp, currLevel};
}   

const isYesterday = (latest: string, today: string) => {
    //convert to date
    const todayDate = new Date(today);
    todayDate.setUTCDate(todayDate.getUTCDate() - 1); //subtract 1 day to find yesterday of today
    //convert back to string
    const yesterday = todayDate.toISOString().split("T")[0];

    return latest === yesterday;
}

export async function computeStreak(userStreak: number, todayDate: string){

    //get all quests and their completions
    let query = supabase.from('quests').select("*, completions(*)").order('created_at', {foreignTable: 'completions', ascending: false});
    const {data: questData, error} = await query;

    if(error)
        throw new Error('Internal server error');

    const completionData: CompletionData[] = [];
    questData.forEach(qd => completionData.push(...qd.completions));
    completionData.sort(
        (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
    );

    const completionToday = completionData.some((cd: CompletionData) => cd.day === todayDate)
    let newStreak = 0;
    if(completionToday) //if there was already at least 1 completion today
        //do not increase the streak
        newStreak = userStreak;
    else{
        //find if the latest completion was yesterday
        const latestCompletion = completionData[0];
        if(!latestCompletion){
            newStreak = 1;
        }else if(isYesterday(latestCompletion.day, todayDate)){
            newStreak = userStreak + 1 //if yesterday, add 1 to the streak
        }else{//if not yesterday, one day was missed, reset the streak
            newStreak = 1;
        }
    }

    return {globalCompletionToday: completionToday, newStreak: newStreak};


}
