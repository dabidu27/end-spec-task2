//create supabase client

import {createClient} from '@supabase/supabase-js';


//validate api key and supabase url before creating client
function getSupabaseConfig(): {url: string, key: string}{
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    const missing = [];
    if (!url || !key){
        if(!url)
            missing.push('Supbase URL');
        if(!key)
            missing.push('Supabase key');
        throw new Error(
            `Supabase configuration is incomplete. Missing: ${missing.join(", ")}`
        );
    }


    return {url, key};
}

const {url, key} = getSupabaseConfig();
const supabase = createClient(url, key);

export default supabase